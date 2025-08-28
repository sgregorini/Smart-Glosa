import { useState } from 'react';

// Defina aqui os GUIDs puros das páginas do seu relatório conforme URL sem o prefixo ReportSection
const pages = [
  { id: 'inicial', label: 'Glosa Inicial', pageName: 'f79f6b269b6876e42ae7' },
  { id: 'rede', label: 'Rede', pageName: 'b1981a68cd38736b503c' },
  { id: 'deepdive',  label: 'DeepDive', pageName: '76378640e8c62a211737' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('inicial');

  // Base da URL de embed sem pageName
  const reportBaseUrl =
    'https://app.powerbi.com/reportEmbed?reportId=98cece73-d6dd-40c1-9a0b-3dc84d71af50&autoAuth=true&ctid=a743694b-8593-4647-bafb-ad9faa1cc904';

  // Monta a URL completa incluindo pageName e ocultando a navegação interna do Power BI
  const current = pages.find(p => p.id === activeTab);
  const embedUrl =
    `${reportBaseUrl}` +
    `&pageName=${current?.pageName}` +
    `&filterPaneEnabled=false` +
    `&navContentPaneEnabled=false`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="flex space-x-4 border-b mb-6">
        {pages.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-yellow-400 text-yellow-400'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="w-full h-[80vh]">
          <iframe
            title={`Dashboard Glosa - ${activeTab}`}
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
