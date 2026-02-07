import React, { useState, useEffect } from 'react';
import { Cooperation } from '../../types';

export const CooperationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [sentRequests, setSentRequests] = useState<Cooperation[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Cooperation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCooperations();
  }, [activeTab]);

  const loadCooperations = async () => {
    setLoading(true);
    try {
      const role = activeTab === 'sent' ? 'consumer' : 'provider';
      const response = await fetch(`http://localhost:8000/cooperations?role=${role}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      
      if (activeTab === 'sent') {
        setSentRequests(data);
      } else {
        setReceivedRequests(data);
      }
    } catch (error) {
      console.error('Failed to load cooperations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const message = prompt('审核通过，可添加回复信息（可选）：');
    if (message === null) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response_message: message })
      });
      alert('已通过合作申请！');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleReject = async (id: string) => {
    const message = prompt('拒绝原因（可选）：');
    if (message === null) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response_message: message })
      });
      alert('已拒绝合作申请');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('确认终止此合作关系？')) return;

    try {
      await fetch(`http://localhost:8000/cooperations/${id}/terminate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      alert('已终止合作关系');
      loadCooperations();
    } catch (error) {
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      terminated: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      expired: '已超时',
      terminated: '已终止'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const renderCooperationList = (cooperations: Cooperation[], isSent: boolean) => {
    if (cooperations.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          暂无{isSent ? '发起的' : '收到的'}合作申请
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cooperations.map((coop) => (
          <div key={coop.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {isSent ? `向 ${coop.toAgencyId} 发起` : `来自 ${coop.fromAgencyId}`}
                  </h3>
                  {getStatusBadge(coop.status)}
                </div>
                <p className="text-sm text-gray-600">
                  申请时间: {new Date(coop.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {coop.requestMessage && (
              <div className="mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">申请说明：</span>
                  {coop.requestMessage}
                </p>
              </div>
            )}

            {coop.responseMessage && (
              <div className="mb-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">回复：</span>
                  {coop.responseMessage}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {!isSent && coop.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(coop.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(coop.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    拒绝
                  </button>
                </>
              )}
              {coop.status === 'approved' && (
                <button
                  onClick={() => handleTerminate(coop.id)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  终止合作
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">合作中心</h2>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sent'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          我发起的 ({sentRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'received'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          收到的申请 ({receivedRequests.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : (
        <>
          {activeTab === 'sent' && renderCooperationList(sentRequests, true)}
          {activeTab === 'received' && renderCooperationList(receivedRequests, false)}
        </>
      )}
    </div>
  );
};
