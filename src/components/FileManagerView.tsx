import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Folder,
  FileText,
  Search,
  FolderPlus,
  FilePlus,
  Trash2,
  RefreshCw,
  ArrowUp,
  HardDrive,
  FileCode,
  FileSpreadsheet,
  FileAudio,
} from 'lucide-react';
import { FileItem } from '../types';
import { api } from '../services/api';

interface FileManagerViewProps {
  onExecuteTool: (toolName: string, args: Record<string, any>) => void;
  onRequestDangerousAction: (toolName: string, args: Record<string, any>, warningText: string) => void;
}

export const FileManagerView: React.FC<FileManagerViewProps> = ({
  onRequestDangerousAction,
}) => {
  const [currentDir, setCurrentDir] = useState<string>('.');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadFiles = async (dir: string) => {
    setIsLoading(true);
    try {
      const res = await api.executeTool('list_files', { directory: dir });
      if (res.result?.items) {
        setFiles(res.result.items);
      }
    } catch (e) {
      console.error('Failed to list files', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentDir);
  }, [currentDir]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadFiles(currentDir);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.executeTool('search_files', { query: searchQuery, directory: currentDir });
      if (res.result?.matches) {
        setFiles(res.result.matches);
      }
    } catch (e) {
      console.error('File search failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await api.executeTool('create_folder', { folderPath: `${currentDir}/${newFolderName.trim()}` });
    setNewFolderName('');
    loadFiles(currentDir);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    await api.executeTool('create_file', {
      filePath: `${currentDir}/${newFileName.trim()}`,
      content: newFileContent,
    });
    setNewFileName('');
    setNewFileContent('');
    loadFiles(currentDir);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DDE7F2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#16BDE3]" />
            <h2 className="text-lg font-black tracking-tight text-[#172033] uppercase">
              Windows File System & Workspace Storage
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse directory structures, search workspaces, manage files, and create directories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFiles(currentDir)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-50 text-[#16BDE3] hover:bg-cyan-100 border border-cyan-200 text-xs font-mono font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Directory path & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] text-xs font-mono shadow-xs">
          <HardDrive className="w-4 h-4 text-[#16BDE3] flex-shrink-0" />
          <span className="text-slate-400">Path:</span>
          <span className="font-bold text-[#172033] truncate">{currentDir}</span>
          {currentDir !== '.' && (
            <button
              onClick={() => setCurrentDir('.')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#172033] hover:bg-slate-100 ml-auto transition-colors"
              title="Go to root"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files (*.py, notes, code)..."
              className="pl-9 pr-4 py-2.5 rounded-2xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-white text-[#172033] shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-bold font-mono transition-colors shadow-xs"
          >
            SEARCH
          </button>
        </form>
      </div>

      {/* Files Table */}
      <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3">NAME</th>
                <th className="pb-3">TYPE</th>
                <th className="pb-3">SIZE</th>
                <th className="pb-3">MODIFIED</th>
                <th className="pb-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No files found in this directory.
                  </td>
                </tr>
              ) : (
                files.map((file, idx) => (
                  <tr key={idx} className="hover:bg-cyan-50/40 transition-colors">
                    <td className="py-3 font-medium text-[#172033] flex items-center gap-2.5">
                      {file.isDirectory ? (
                        <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : file.extension === '.ts' || file.extension === '.tsx' || file.extension === '.py' ? (
                        <FileCode className="w-4 h-4 text-[#16BDE3] flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span
                        className={`truncate max-w-xs ${
                          file.isDirectory ? 'cursor-pointer text-[#16BDE3] hover:underline font-bold' : ''
                        }`}
                        onClick={() => {
                          if (file.isDirectory) setCurrentDir(file.path || file.name);
                        }}
                      >
                        {file.name}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {file.isDirectory ? 'Directory' : file.extension || 'File'}
                    </td>
                    <td className="py-3 text-slate-500">
                      {file.isDirectory ? '--' : formatFileSize(file.size)}
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          onRequestDangerousAction(
                            'delete_file',
                            { filePath: file.path || file.name },
                            `Are you sure you want to permanently delete '${file.name}'?`
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={`Delete ${file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Folder & File Modals/Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreateFolder} className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#16BDE3]" />
            <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
              Create New Folder
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Folder name (e.g. AI-Models)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#16BDE3] bg-slate-50 text-[#172033]"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors disabled:opacity-40 shadow-xs"
            >
              CREATE
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateFile} className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-[#DDE7F2] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-[#6675F5]" />
            <h3 className="text-xs font-bold text-[#172033] font-mono uppercase tracking-wider">
              Create New Document
            </h3>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="File name (e.g. notes.txt, script.py)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#6675F5] bg-slate-50 text-[#172033]"
            />
            <textarea
              rows={2}
              placeholder="Initial file text content..."
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#DDE7F2] text-xs font-mono focus:outline-hidden focus:border-[#6675F5] bg-slate-50 text-[#172033]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newFileName.trim()}
                className="px-5 py-2 rounded-xl bg-[#6675F5] hover:bg-indigo-600 text-white text-xs font-mono font-bold transition-colors disabled:opacity-40 shadow-xs"
              >
                SAVE FILE
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
