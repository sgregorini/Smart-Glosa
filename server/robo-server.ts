// server/robo-server.ts
import express from "express";
import path from "path";
import fs from "fs/promises";
import os from "os";
import puppeteer, { Browser, Page, Frame, ElementHandle } from "puppeteer";

const app = express();
app.use(express.json());

// ====== CONFIG ======
const ZERO_GLOSA_LOGIN = "https://apps.zeroglosa.com.br/opty-spec/login/auth";
const ZERO_GLOSA_PORTAL = "https://apps.zeroglosa.com.br/opty-spec/zg/usuario/nossoPortal";
const USERNAME = process.env.ZG_USER || "gustavo.cunha";
const PASSWORD = process.env.ZG_PASS || "grcEXI2025!";
const HEADLESS = (process.env.HEADLESS ?? "false").toLowerCase() !== "false"; // HEADLESS=true (default)

type ReportId = "analitico_glosas" | "visao_pagamento" | "glosa_mantida";

const WAIT_AFTER_EXPORT_MS = 15000; // 15s entre Export e Download
const VIEWPORT = { width: 1440, height: 900 }; // garante navbar desktop no headless

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ====== HELPERS GERAIS ======
async function setupDownloadDir(page: Page) {
  const downloadDir = await fs.mkdtemp(path.join(os.tmpdir(), "zg-"));
  // @ts-ignore usar CDP diretamente é ok aqui
  const client = await (page as any)._client();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });
  return downloadDir;
}

// Click robusto (evita "not clickable") com fallback via evaluate
async function safeClick(frame: Frame, el: ElementHandle<Element>) {
  try {
    await el.click({ delay: 10 });
  } catch {
    await frame.evaluate((btn: any) => (btn as HTMLElement).click(), el as any);
  }
}

// Busca <button> com ícone <mat-icon> específico (ex.: "file_download", "close") dentro de root
async function queryButtonByIcon(
  frame: Frame,
  root: ElementHandle<Element>,
  iconText: string
): Promise<ElementHandle<Element> | null> {
  const h = await frame.evaluateHandle(
    (rootEl: any, icon: string) => {
      const buttons = rootEl.querySelectorAll("button");
      for (const b of buttons) {
        const i = b.querySelector("mat-icon");
        const t = (i?.textContent || "").trim().toLowerCase();
        if (t.includes(icon.toLowerCase())) return b;
      }
      return null;
    },
    root as any,
    iconText
  );
  const el = h.asElement();
  if (el) return el as ElementHandle<Element>;
  await h.dispose();
  return null;
}

// Busca <button> por texto dentro de root
async function queryButtonByText(
  frame: Frame,
  root: ElementHandle<Element>,
  ...labels: string[]
): Promise<ElementHandle<Element> | null> {
  const lowered = labels.map((l) => l.toLowerCase());
  const h = await frame.evaluateHandle(
    (rootEl: any, lbls: string[]) => {
      const buttons = rootEl.querySelectorAll("button");
      for (const b of buttons) {
        const t = (b.textContent || "").trim().toLowerCase();
        if (t && lbls.some((l) => t.includes(l))) return b;
      }
      return null;
    },
    root as any,
    lowered
  );
  const el = h.asElement();
  if (el) return el as ElementHandle<Element>;
  await h.dispose();
  return null;
}

// ====== FUNÇÕES ESPECÍFICAS DO BOX DE EXPORT ======
// Tudo aqui trabalha **no frame do relatório** (f1) para não errar contexto.

// Localiza o CARD do exports (preferência por seletor direto; fallback pela lista)
async function findExportsCardInFrame(
  frame: Frame,
  timeoutMs = 8000
): Promise<ElementHandle<Element> | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const direct = await frame.$("zg-report-exports-box mat-card");
    if (direct) return direct;

    const oneItem = (await frame.$$("zg-exports-list-item"))?.[0];
    if (oneItem) {
      const h = await frame.evaluateHandle((it: any) => {
        let n: HTMLElement | null = it as HTMLElement;
        while (n && n.tagName && n.tagName.toLowerCase() !== "mat-card") {
          n = n.parentElement;
        }
        return n || null;
      }, oneItem as any);
      const card = h.asElement();
      if (card) return card as ElementHandle<Element>;
      await h.dispose();
    }
    await sleep(200);
  }
  return null;
}

// Fecha o exports card se estiver aberto
async function ensureExportsCardClosed(frame: Frame) {
  try {
    const card = await findExportsCardInFrame(frame, 1200);
    if (!card) return;

    console.log("ℹ️ Exports card detectado; fechando...");
    let closeBtn =
      (await queryButtonByIcon(frame, card, "close")) ||
      (await queryButtonByText(frame, card, "Fechar", "Close")) ||
      (await card.$("mat-card-content > div:nth-of-type(1) button:nth-of-type(2)"));

    if (closeBtn) {
      await safeClick(frame, closeBtn);
      console.log("✅ Exports card fechado.");
      await sleep(400);
    } else {
      // Como fallback, tenta ESC no frame
      await (frame as any)._client().send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Escape",
      });
      await sleep(300);
    }
  } catch {
    // segue
  }
}

// Clica no "Exportar" DO CABEÇALHO do card (não baixa itens antigos)
async function clickHeaderExportInFrame(frame: Frame) {
  const card = await findExportsCardInFrame(frame, 8000);
  if (!card) throw new Error("Exports box não visível para clicar em Exportar.");

  // Padrão do cabeçalho: [Exportar] [Fechar]
  const exportBtn =
    (await queryButtonByText(frame, card, "Exportar")) ||
    (await card.$("zg-exports-list-item button:nth-of-type(1) mat-icon"));

  if (!exportBtn) throw new Error("Botão 'Exportar' do cabeçalho não encontrado.");

  await safeClick(frame, exportBtn);
  console.log("✅ Cliquei no botão 'Exportar' do cabeçalho.");
}

// Baixa APENAS o item mais novo da lista (assumindo que entra no TOPO; fallback: fim)
async function downloadLatestFromListInFrame(frame: Frame) {
  const card = await findExportsCardInFrame(frame, 8000);
  if (!card) throw new Error("Exports box não encontrado para baixar.");

  const items = await card.$$("zg-exports-list-item");
  if (!items || items.length === 0) throw new Error("Nenhum item na lista de exports.");

  // Heurística: tenta topo (novo no topo). Se falhar, tenta o último.
  const ordered: ElementHandle<Element>[] = [items[0], items[items.length - 1]];

  for (const row of ordered) {
    const dlBtnByIcon = await frame.evaluateHandle((r: any) => {
      const btns = r.querySelectorAll("button");
      for (const b of btns) {
        const i = b.querySelector("mat-icon");
        const t = (i?.textContent || "").trim().toLowerCase();
        if (t.includes("file_download")) return b;
      }
      return null;
    }, row as any);

    let btn = dlBtnByIcon.asElement() as ElementHandle<Element> | null;
    if (!btn) btn = (await row.$("button:nth-of-type(1)")) as ElementHandle<Element> | null;

    if (btn) {
      await safeClick(frame, btn);
      console.log("✅ Download disparado para o item mais recente.");
      await sleep(800);
      return;
    }
  }
  throw new Error("Não consegui localizar botão de Download no item mais recente.");
}

// Fluxo: fechar se tiver aberto → Exportar → esperar 15s → baixar novo → fechar
async function exportAndDownloadLatestInFrame(frame: Frame) {
  await ensureExportsCardClosed(frame); // limpa estado anterior
  await clickHeaderExportInFrame(frame);
  console.log(`⏳ Aguardando ${WAIT_AFTER_EXPORT_MS / 1000}s para processamento...`);
  await sleep(WAIT_AFTER_EXPORT_MS);
  await downloadLatestFromListInFrame(frame);
  await ensureExportsCardClosed(frame); // fecha após baixar para próxima execução
}

// ====== LOGIN / FRAME DE RELATÓRIOS ======
async function login(page: Page) {
  console.log("➡️ Indo para login do Zero Glosa...");
  await page.goto(ZERO_GLOSA_LOGIN, { waitUntil: "domcontentloaded" });

  await page.waitForSelector("#username", { timeout: 30000 });
  await page.type("#username", USERNAME, { delay: 20 });

  await page.waitForSelector("#password", { timeout: 30000 });
  await page.type("#password", PASSWORD, { delay: 20 });

  console.log("➡️ Submetendo login...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
    page.click("#submit"),
  ]);

  try {
    await page.waitForSelector("#btnNaoExibirPopUpLogin_0", { timeout: 5000 });
    await page.click("#btnNaoExibirPopUpLogin_0");
    console.log("ℹ️ Fechei popup inicial.");
  } catch {
    console.log("ℹ️ Sem popup inicial, segue.");
  }

  // 🔥 Em headless a navbar pode mudar por viewport; vamos direto ao portal,
  // que é a tela onde existe o menu "Painéis e relatórios".
  await page.goto(ZERO_GLOSA_PORTAL, { waitUntil: "networkidle0", timeout: 60000 });

  console.log("✅ Login concluído e portal aberto.");
}

async function waitForReportsFrame(page: Page): Promise<Frame> {
  const maxAttempts = 20; // 20s
  for (let i = 0; i < maxAttempts; i++) {
    for (const frame of page.frames()) {
      try {
        const element = await frame.$("zg-category-list-item");
        if (element) {
          console.log(`✅ Frame de relatórios encontrado na tentativa ${i + 1}.`);
          return frame;
        }
      } catch {}
    }
    console.log(`⌛ Tentativa ${i + 1} de ${maxAttempts}: Frame não encontrado, aguardando...`);
    await sleep(1000);
  }
  throw new Error("❌ Frame de relatórios não foi encontrado após várias tentativas.");
}

// Abre “Painéis e relatórios” de forma resiliente (desktop + mobile)
async function openReportsMenu(page: Page) {
  // Tenta menu desktop
  const desktopSel = "ul.navbar-left a";
  const el = await page.$(desktopSel);
  if (el) {
    await page.waitForSelector(desktopSel, { visible: true, timeout: 15000 });
    await page.click(desktopSel, { delay: 50 });
    return;
  }

  // Fallback: layout móvel — tenta abrir hambúrguer e achar o item
  const candidates = [
    "button[aria-label*='menu']",
    "button.mat-icon-button",
    "button[aria-label*='abrir']",
    "button[aria-label*='open']",
  ];

  for (const sel of candidates) {
    const b = await page.$(sel);
    if (b) {
      await b.click();
      await sleep(300);
      const itemSel = "ul.navbar-left a";
      const ok = await page.$(itemSel);
      if (ok) {
        await page.click(itemSel, { delay: 50 });
        return;
      }
    }
  }

  throw new Error("Não consegui abrir 'Painéis e relatórios' (verifique viewport/headless).");
}

// ====== FLUXOS DOS RELATÓRIOS ======
async function runAnaliticoDeGlosas(page: Page) {
  console.log("➡️ Abrindo 'Painéis e relatórios'...");
  await openReportsMenu(page);

  console.log("✅ Aguardando frame de relatórios...");
  const f1 = await waitForReportsFrame(page);

  console.log("✅ Entrei no frame, abrindo categoria..."); 
  await f1.waitForSelector("zg-category-list-item:nth-of-type(4) h4", { timeout: 30000 }); 
  await f1.click("zg-category-list-item:nth-of-type(4) h4");

  console.log("➡️ Selecionando relatório Analítico de Glosas...");
  await f1.waitForSelector("zg-spreadsheet-list-viewer-item:nth-of-type(3) h4", { timeout: 30000 });
  await f1.click("zg-spreadsheet-list-viewer-item:nth-of-type(3) h4");

  console.log("⏳ Aguardando viewer carregar...");
  await sleep(5000);

  const innerFrames = f1.childFrames();
  const viewer = innerFrames[1] ?? innerFrames[0] ?? f1;

  try {
    await viewer.waitForSelector("#button-1035-btnInnerEl", { timeout: 4000 });
    await viewer.click("#button-1035-btnInnerEl");
    await viewer.waitForSelector("#button-1006-btnIconEl", { timeout: 4000 });
    await viewer.click("#button-1006-btnIconEl");
    console.log("ℹ️ Fechei modais iniciais do viewer.");
  } catch {
    console.log("ℹ️ Sem modais iniciais no viewer.");
  }

  // Fluxo correto: fechar box → exportar → esperar → baixar novo → fechar
  await exportAndDownloadLatestInFrame(f1);
}

async function runVisaoPagamento(page: Page) {
  console.log("➡️ Abrindo 'Painéis e relatórios'...");
  await openReportsMenu(page);

  console.log("✅ Aguardando frame de relatórios...");
  const f1 = await waitForReportsFrame(page);

  console.log("✅ Entrei no frame, abrindo categoria...");
  await f1.waitForSelector("zg-category-list-item:nth-of-type(4) h4", { timeout: 30000 });
  await f1.click("zg-category-list-item:nth-of-type(4) h4");

  console.log("➡️ Selecionando relatório Visão por Pagamento...");
  await f1.waitForSelector("zg-spreadsheet-list-viewer-item:nth-of-type(5) h4", { timeout: 30000 });
  await f1.click("zg-spreadsheet-list-viewer-item:nth-of-type(5) h4");

  console.log("⏳ Aguardando viewer carregar...");
  await sleep(5000);

  const innerFrames = f1.childFrames();
  const viewer = innerFrames[1] ?? innerFrames[0] ?? f1;

  try {
    await viewer.waitForSelector("#button-1035-btnInnerEl", { timeout: 4000 });
    await viewer.click("#button-1035-btnInnerEl");
    await viewer.waitForSelector("#button-1006-btnIconEl", { timeout: 4000 });
    await viewer.click("#button-1006-btnIconEl");
    console.log("ℹ️ Fechei modais iniciais do viewer.");
  } catch {
    console.log("ℹ️ Sem modais iniciais no viewer.");
  }

  await exportAndDownloadLatestInFrame(f1);
}

async function runGlosaMantida(page: Page) {
  console.log("➡️ Abrindo 'Painéis e relatórios'...");
  await openReportsMenu(page);

  console.log("✅ Aguardando frame de relatórios...");
  const f1 = await waitForReportsFrame(page);

  console.log("✅ Frame encontrado, abrindo categoria...");
  await f1.waitForSelector("zg-category-list-item:nth-of-type(4) h4", { timeout: 30000 });
  await f1.click("zg-category-list-item:nth-of-type(4) h4");

  console.log("➡️ Selecionando Glosa Mantida...");
  await f1.waitForSelector("zg-spreadsheet-list-viewer-item:nth-of-type(7) h4", { timeout: 30000 });
  await f1.click("zg-spreadsheet-list-viewer-item:nth-of-type(7) h4");

  console.log("⏳ Aguardando viewer carregar...");
  await sleep(5000);

  const innerFrames = f1.childFrames();
  const viewer = innerFrames[1] ?? innerFrames[0] ?? f1;

  try {
    await viewer.waitForSelector("#button-1035-btnInnerEl", { timeout: 4000 });
    await viewer.click("#button-1035-btnInnerEl");
    await viewer.waitForSelector("#button-1006-btnIconEl", { timeout: 4000 });
    await viewer.click("#button-1006-btnIconEl");
    console.log("ℹ️ Fechei modais iniciais do viewer.");
  } catch {
    console.log("ℹ️ Sem modais iniciais no viewer.");
  }

  await exportAndDownloadLatestInFrame(f1);
}

async function runReportFlow(id: ReportId, page: Page) {
  if (id === "analitico_glosas") return runAnaliticoDeGlosas(page);
  if (id === "visao_pagamento") return runVisaoPagamento(page);
  if (id === "glosa_mantida") return runGlosaMantida(page);
  throw new Error(`Relatório desconhecido: ${id}`);
}

// ====== ROTA ======
app.post("/api/robo/:id", async (req, res) => {
  const id = req.params.id as ReportId;
  let browser: Browser | null = null;
  let downloadDir: string = "";
  try {
    browser = await puppeteer.launch({
      headless: (HEADLESS ? ("new" as any) : false),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      ],
      defaultViewport: VIEWPORT, // garante navbar desktop no headless
      userDataDir: path.resolve("./.pup-profile"),
    });

    const page = await browser.newPage();
    // reforça o viewport mesmo em headful
    await page.setViewport(VIEWPORT);

    downloadDir = await setupDownloadDir(page);

    await login(page);
    await runReportFlow(id, page);

    const filePath = await waitForFirstFile(downloadDir, 180_000);
    const fileName = path.basename(filePath);

    const buf = await fs.readFile(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.status(200).send(buf);
  } catch (e: any) {
    console.error("❌ Erro no robô:", e);
    res.status(500).json({ error: e.message || "Falha ao gerar relatório" });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

async function waitForFirstFile(dir: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const files = await fs.readdir(dir);
    const done = files.find((f) => !f.endsWith(".crdownload"));
    if (done) return path.join(dir, done);
    await sleep(750);
  }
  throw new Error("Timeout aguardando download do relatório.");
}

const PORT = process.env.PORT_ROBO ? Number(process.env.PORT_ROBO) : 3001;
app.listen(PORT, () => {
  console.log(`[robo] rodando em http://localhost:${PORT} (headless=${HEADLESS})`);
});
