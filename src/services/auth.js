import { supabase } from './db';

const SESSION_KEY = 'sigcomercio_active_session';

export const authService = {
  /**
   * Realiza a simulação de login de um usuário
   * @param {string} username 
   * @param {string} password 
   * @returns {Object} Usuário logado
   */
  async login(username, password) {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.rpc('verify_app_login', { p_username: username, p_password: password });
    if (error) throw error;
    const user = data?.[0];

    if (!user) {
      throw new Error('Usuário ou senha incorretos.');
    }

    // Cria objeto da sessão sem a senha por segurança
    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Encerra a sessão ativa do usuário
   */
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    return true;
  },

  /**
   * Obtém o usuário atualmente autenticado
   * @returns {Object|null} Usuário ativo ou null
   */
  getCurrentUser() {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch (e) {
      this.logout();
      return null;
    }
  }
};
