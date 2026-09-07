import { useState, useCallback, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { FlashMessage } from './components/FlashMessage'
import { ProjectForm } from './components/ProjectForm'
import { ProjectTable } from './components/ProjectTable'
import { ProjectPreview } from './components/ProjectPreview'
import { useProjectManager } from './hooks/useProjectManager'
import { useExport } from './hooks/useExport'
import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  const [flashMsg, setFlashMsg] = useState({ text: '', type: 'ok', id: 0 })
  
  // Read initial route from URL
  const [previewId, setPreviewId] = useState(() => {
    if (window.location.pathname.startsWith('/preview')) {
      const params = new URLSearchParams(window.location.search);
      return params.get('id') || 'auto';
    }
    return null;
  });

  // Handle browser back and forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/preview')) {
        const params = new URLSearchParams(window.location.search);
        setPreviewId(params.get('id') || 'auto');
      } else {
        setPreviewId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showFlash = useCallback((msg, ok) => {
    setFlashMsg({ text: msg, type: ok ? 'ok' : 'err', id: Date.now() })
    setTimeout(() => {
      setFlashMsg(prev => prev.id === flashMsg.id ? { ...prev, text: '' } : prev)
    }, 5000)
  }, [flashMsg.id])

  const {
    projects,
    addProject,
    toggleProjectStatus,
    deleteProject
  } = useProjectManager(showFlash)

  const { exportSingle, exportZip } = useExport(showFlash)

  const handleOpenPreview = (id) => {
    setPreviewId(id);
    const targetUrl = id ? `/preview?id=${id}` : '/preview';
    window.history.pushState({ previewId: id }, '', targetUrl);
  };

  const handleClosePreview = () => {
    setPreviewId(null);
    if (window.location.pathname.startsWith('/preview')) {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <ThemeProvider>
      <TopBar />
      <div className="wrap">
        <FlashMessage message={flashMsg.text} type={flashMsg.type} />
        
        <ProjectForm onAddProject={addProject} />
        
        <ProjectTable 
          projects={projects}
          onPreview={handleOpenPreview}
          onExportSingle={exportSingle}
          onExportZip={exportZip}
          onToggle={toggleProjectStatus}
          onDelete={deleteProject}
        />
      </div>

      {previewId && (
        <ProjectPreview 
          projectId={previewId} 
          onClose={handleClosePreview} 
        />
      )}
    </ThemeProvider>
  )
}
