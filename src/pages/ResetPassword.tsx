import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  const parsed = useMemo(() => {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    return {
      typeQ: sp.get('type'),
      code: sp.get('code'), 
      emailQ: sp.get('email'),
    };
  }, [location.key]);


  // 1. Efeito para trocar o token pelo código
  useEffect(() => {
    if (parsed.typeQ === 'recovery' && parsed.code && parsed.emailQ) {
      (async () => {
        // Tenta trocar o código (TokenHash) por uma sessão ativa
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: 'recovery',
          email: parsed.emailQ,
          token: parsed.code, 
        });

        if (verifyError) {
          setError(verifyError.message);
          setInitialCheckComplete(true);
        }
        // Se for bem-sucedido, o listener abaixo captura a nova sessão.
      })();
    } else {
        // Se a página for carregada sem parâmetros, checa se já tem sessão
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSessionReady(!!session);
            setInitialCheckComplete(true);
            if (!session) {
                setError("O link de recuperação está inválido ou você não solicitou uma redefinição.");
            }
        });
    }
  }, [parsed]);

  // 2. Efeito para ouvir mudanças no estado de autenticação (captura a nova sessão)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // O evento 'SIGNED_IN' ocorre logo após o verifyOtp ser bem-sucedido.
      if (session && event === 'SIGNED_IN') {
        setSessionReady(true);
        setError(null);
        setInitialCheckComplete(true);

        // Limpa a URL se houver parâmetros (tanto query quanto hash)
        if (window.location.search || window.location.hash) {
            window.history.replaceState(null, '', '/reset-password');
        }
      } else if (!session && initialCheckComplete && !parsed.code) {
        // Se a verificação inicial já ocorreu e não há sessão, mostra o erro.
        // Isso evita que o erro pisque antes da verificação.
        setError("O link de recuperação está inválido ou expirado. Por favor, solicite uma nova redefinição.");
      }
    });

    return () => subscription.unsubscribe();
  }, [initialCheckComplete, parsed.code]);


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!sessionReady) {
        setError("Sessão não verificada. Por favor, use o link completo do e-mail.");
        setLoading(false);
        return;
    }

    try {
      if (newPassword.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      alert('Senha alterada com sucesso!');
      navigate('/login');
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleUpdate} className="bg-white shadow p-6 rounded-lg w-96">
        <h1 className="text-lg font-semibold mb-4">Definir nova senha</h1>
        
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        
        {!initialCheckComplete && (
            <div className="text-blue-600 text-sm mb-3">
                Verificando link de recuperação...
            </div>
        )}
        
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full border px-3 py-2 rounded mb-3"
          disabled={!sessionReady || loading || !initialCheckComplete} 
        />
        <button
          type="submit"
          disabled={!sessionReady || loading || !initialCheckComplete}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded"
        >
          {loading ? 'Atualizando…' : 'Atualizar senha'}
        </button>
      </form>
    </div>
  );
}