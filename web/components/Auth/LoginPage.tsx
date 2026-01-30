import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (!fullName || !agencyName) {
          setError('请填写完整信息');
          setIsLoading(false);
          return;
        }
        await register(username, password, fullName, agencyName);
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">智旅云</h1>
            <p className="text-sm text-slate-500">旅行社碎片化资源智能管理系统</p>
          </div>

          {/* Tab 切换 */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                !isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
              }`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="请输入密码"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">姓名</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="请输入真实姓名"
                    required={!isLogin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">旅行社名称</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="请输入旅行社名称"
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
