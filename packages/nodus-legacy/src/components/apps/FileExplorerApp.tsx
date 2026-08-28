import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  FileText,
  FileCode,
  Archive,
  Download,
  Upload,
  ArrowLeft,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Search,
  Grid,
  List,
  Laptop,
  Tablet,
  Check,
  Zap,
  Share2,
  Lock,
  Clock
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { simulateBridgeRpc } from '../../utils/bridgeProtocol';

interface NodeFile {
  name: string;
  isDir: boolean;
  sizeBytes: number;
  modTime: string;
  extension?: string;
}

interface TransferItem {
  id: string;
  fileName: string;
  sourceNode: string;
  targetNode: string;
  sizeBytes: number;
  transferredBytes: number;
  speedMbps: number;
  status: 'TRANSFERRING' | 'COMPLETED' | 'FAILED';
}

export const FileExplorerApp: React.FC = () => {
  const { devices, activeDeviceId, selectDevice, addNotification } = useLauncher();

  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeDeviceId);
  const [currentPath, setCurrentPath] = useState<string>('/home/nodus');
  const [files, setFiles] = useState<NodeFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transfers, setTransfers] = useState<TransferItem[]>([]);

  const targetDevice = devices.find((d) => d.id === selectedNodeId) || devices[0];

  const fetchDirectory = async (pathStr: string) => {
    setLoading(true);
    audio.playTap();
    const res = await simulateBridgeRpc('LIST_DIRECTORY', selectedNodeId, { path: pathStr });
    if (res.response.status === 'OK' && res.response.result) {
      const data = res.response.result as any;
      setFiles(data.files || []);
      setCurrentPath(data.currentPath || pathStr);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [selectedNodeId]);

  const handleNavigateDir = (folderName: string) => {
    const newPath = currentPath.endsWith('/')
      ? `${currentPath}${folderName}`
      : `${currentPath}/${folderName}`;
    fetchDirectory(newPath);
  };

  const handleNavigateUp = () => {
    if (currentPath === '/' || currentPath === '/home/nodus') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    fetchDirectory(newPath || '/home/nodus');
  };

  const handleInitiateTransfer = (file: NodeFile) => {
    audio.playTap();
    const newTransfer: TransferItem = {
      id: `tr-${Date.now()}`,
      fileName: file.name,
      sourceNode: targetDevice.name,
      targetNode: 'Local Workstation',
      sizeBytes: file.sizeBytes || 10485760,
      transferredBytes: 0,
      speedMbps: Number((35 + Math.random() * 40).toFixed(1)),
      status: 'TRANSFERRING',
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    // Progress simulation
    let progress = 0;
    const interval = setInterval(() => {
      progress += file.sizeBytes / 5;
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.id === newTransfer.id) {
            const isDone = progress >= file.sizeBytes;
            return {
              ...t,
              transferredBytes: Math.min(progress, file.sizeBytes),
              status: isDone ? 'COMPLETED' : 'TRANSFERRING',
            };
          }
          return t;
        })
      );

      if (progress >= file.sizeBytes) {
        clearInterval(interval);
        addNotification({
          appId: 'files',
          appName: 'Cluster File Transfer',
          title: 'Mesh Transfer Complete',
          message: `Finished transferring "${file.name}" from ${targetDevice.name}`,
          iconName: 'Download',
          color: '#34C759',
        });
      }
    }, 600);
  };

  const getFileIcon = (file: NodeFile) => {
    if (file.isDir) return <Folder size={18} className="text-[#34C759]" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['json', 'js', 'ts', 'rs', 'go', 'py'].includes(ext || ''))
      return <FileCode size={18} className="text-[#007AFF]" />;
    if (['zip', 'tar', 'gz', '7z'].includes(ext || ''))
      return <Archive size={18} className="text-[#FF9500]" />;
    if (['txt', 'md', 'log'].includes(ext || ''))
      return <FileText size={18} className="text-[#BF5AF2]" />;
    return <File size={18} className="text-[#8E8E93]" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none font-sans overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#34C759] flex items-center justify-center text-white shadow-lg shadow-[#007AFF]/20">
            <HardDrive size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Cluster Mesh File Explorer</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] font-mono font-bold border border-[#007AFF]/30">
                P2P SYNCTHING
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Direct remote filesystem browser & peer-to-peer file transfers across Tailnet nodes
            </p>
          </div>
        </div>

        {/* View Mode & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDirectory(currentPath)}
            className="p-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-white rounded-xl text-xs transition"
            title="Refresh Directory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-[#1C1C1E] p-0.5 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'list' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'
              }`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'grid' ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93]'
              }`}
            >
              <Grid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Node Selector & Path Breadcrumbs */}
      <div className="px-5 py-2.5 bg-[#0E0E10] border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
        {/* Devices */}
        <div className="flex items-center bg-[#1C1C1E] p-1 rounded-xl border border-white/5 text-xs font-semibold gap-1">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelectedNodeId(d.id);
                selectDevice(d.id);
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                selectedNodeId === d.id
                  ? 'bg-[#007AFF] text-white font-bold shadow'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              {d.type === 'desktop' ? <Laptop size={13} /> : <Tablet size={13} />}
              {d.name}
            </button>
          ))}
        </div>

        {/* Path Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs font-mono bg-[#1C1C1E] px-3 py-1.5 rounded-xl border border-white/5 text-white flex-1 max-w-md overflow-x-auto no-scrollbar">
          <button
            onClick={handleNavigateUp}
            className="text-[#8E8E93] hover:text-white transition p-0.5"
            title="Up one level"
          >
            <ArrowLeft size={13} />
          </button>
          <span className="text-[#8E8E93]">/</span>
          {currentPath
            .split('/')
            .filter(Boolean)
            .map((part, idx, arr) => (
              <React.Fragment key={idx}>
                <span className={idx === arr.length - 1 ? 'font-bold text-[#007AFF]' : 'text-[#8E8E93]'}>
                  {part}
                </span>
                {idx < arr.length - 1 && <ChevronRight size={12} className="text-[#8E8E93]" />}
              </React.Fragment>
            ))}
        </div>

        {/* Search */}
        <div className="relative w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#007AFF]"
          />
        </div>
      </div>

      {/* Main Files View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Quick Navigation Panel */}
        <div className="w-48 bg-[#121214] border-r border-white/5 p-3 space-y-1 text-xs shrink-0 hidden md:block select-none">
          <span className="text-[10px] text-[#8E8E93] font-semibold uppercase tracking-wider px-2 block mb-2">
            Favorites
          </span>
          {[
            { label: 'Home', path: '/home/nodus', icon: Folder },
            { label: 'Documents', path: '/home/nodus/Documents', icon: Folder },
            { label: 'Downloads', path: '/home/nodus/Downloads', icon: Folder },
            { label: 'Projects', path: '/home/nodus/Projects', icon: Folder },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => fetchDirectory(item.path)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition ${
                currentPath === item.path
                  ? 'bg-[#007AFF]/15 text-[#007AFF] font-bold'
                  : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Directory Content Area */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#8E8E93] font-mono gap-2">
              <RefreshCw size={16} className="animate-spin text-[#007AFF]" />
              Reading remote filesystem directory...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[#8E8E93] gap-2 py-16">
              <Folder size={36} className="opacity-30" />
              <span>Directory is empty or no files match search.</span>
            </div>
          ) : viewMode === 'list' ? (
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#8E8E93] text-[11px] select-none">
                  <th className="py-2 px-3 font-semibold">NAME</th>
                  <th className="py-2 px-3 font-semibold">SIZE</th>
                  <th className="py-2 px-3 font-semibold">MODIFIED</th>
                  <th className="py-2 px-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFiles.map((file) => (
                  <tr key={file.name} className="hover:bg-white/5 transition group">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(file)}
                        {file.isDir ? (
                          <button
                            onClick={() => handleNavigateDir(file.name)}
                            className="font-bold text-white hover:text-[#007AFF] transition"
                          >
                            {file.name}
                          </button>
                        ) : (
                          <span className="text-white font-medium">{file.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#8E8E93]">{formatSize(file.sizeBytes)}</td>
                    <td className="py-2.5 px-3 text-[#8E8E93]">{file.modTime}</td>
                    <td className="py-2.5 px-3 text-right">
                      {!file.isDir && (
                        <button
                          onClick={() => handleInitiateTransfer(file)}
                          className="px-2.5 py-1 bg-[#007AFF]/15 hover:bg-[#007AFF]/25 text-[#007AFF] border border-[#007AFF]/30 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          <Download size={12} /> Pull
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.name}
                  className="p-3.5 bg-[#1C1C1E] border border-white/5 hover:border-[#007AFF]/40 rounded-2xl transition flex flex-col justify-between space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-white/5 text-white">{getFileIcon(file)}</div>
                    {!file.isDir && (
                      <button
                        onClick={() => handleInitiateTransfer(file)}
                        className="p-1.5 bg-[#007AFF]/15 text-[#007AFF] hover:bg-[#007AFF] hover:text-white rounded-lg transition"
                        title="Download to Local"
                      >
                        <Download size={13} />
                      </button>
                    )}
                  </div>

                  <div>
                    {file.isDir ? (
                      <button
                        onClick={() => handleNavigateDir(file.name)}
                        className="text-xs font-bold text-white hover:text-[#007AFF] truncate block text-left w-full"
                      >
                        {file.name}
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-white truncate block">{file.name}</span>
                    )}
                    <span className="text-[10px] text-[#8E8E93] font-mono block mt-0.5">
                      {formatSize(file.sizeBytes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Queue Drawer Footer */}
      {transfers.length > 0 && (
        <div className="border-t border-white/10 bg-[#121214] p-3 space-y-2 shrink-0 select-none">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#8E8E93] flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Zap size={13} className="text-[#34C759]" /> Active Mesh Transfers ({transfers.length})
            </span>
            <button
              onClick={() => setTransfers([])}
              className="text-[10px] text-[#8E8E93] hover:text-white"
            >
              Clear Queue
            </button>
          </div>

          <div className="space-y-2 max-h-24 overflow-y-auto">
            {transfers.map((t) => {
              const pct = Math.min(100, Math.floor((t.transferredBytes / (t.sizeBytes || 1)) * 100));
              return (
                <div key={t.id} className="bg-[#1C1C1E] p-2 rounded-xl border border-white/5 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white truncate max-w-[200px]">{t.fileName}</span>
                    <span className="text-[#34C759] font-bold">
                      {t.status === 'COMPLETED' ? 'COMPLETED' : `${pct}% (${t.speedMbps} MB/s)`}
                    </span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#007AFF] to-[#34C759] h-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
