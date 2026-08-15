import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { CertificateTemplateConfig, TemplateElement, A4_WIDTH, A4_HEIGHT } from './types';
import { Plus, Trash2, Save, RotateCcw, Loader2, GripHorizontal, Info, Upload, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TemplateEditorProps {
  config: CertificateTemplateConfig;
  onChange: (config: CertificateTemplateConfig) => void;
  onSave?: () => void;
  onReset?: () => void;
  saving?: boolean;
}

export default function TemplateEditor({ config, onChange, onSave, onReset, saving }: TemplateEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [zoomMode, setZoomMode] = useState<string | number>('fit');
  const [fitScale, setFitScale] = useState(1);

  // Dynamic Scaling Engine
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // 64px padding (p-8 on all sides)
        const availableWidth = clientWidth - 64;
        const availableHeight = clientHeight - 64;
        
        const scaleByWidth = availableWidth / A4_WIDTH;
        const scaleByHeight = availableHeight / A4_HEIGHT;
        
        let newScale = Math.min(scaleByWidth, scaleByHeight);
        if (newScale > 1) newScale = 1; // Prevent stretching beyond 100% on huge screens
        setFitScale(newScale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const currentScale = zoomMode === 'fit' ? fitScale : (zoomMode as number);

  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('uploads/')) return `/api/r2/image?key=${encodeURIComponent(url)}`;
    return url;
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingBg(true);
    try {
      const res = await fetch('/api/r2/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type || 'image/png' })
      });
      const { url, objectKey, error } = await res.json();
      if (error) throw new Error(error);

      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'image/png' }});
      
      onChange({ ...config, background_image_url: objectKey });
    } catch (err) {
      alert('មានបញ្ហាក្នុងការបញ្ចូលរូបភាព (Upload failed)');
    } finally {
      setUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatEditorText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/({{.*?}})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return <span key={index} style={{ color: '#FF0000', fontWeight: 'bold' }}>{part}</span>;
      }
      return part;
    });
  };

  const updateElement = (id: string, updates: Partial<TemplateElement>) => {
    onChange({
      ...config,
      elements: config.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    });
  };

  const addElement = () => {
    const newEl: TemplateElement = {
      id: `el-${Date.now()}`,
      type: 'text',
      x: (A4_WIDTH / 2) - 150,
      y: (A4_HEIGHT / 2) - 30,
      width: 300,
      height: 60,
      content: 'អត្ថបទថ្មី...',
      fontFamily: 'Kantumruy Pro',
      fontSize: 16,
      color: '#000000',
      textAlign: 'center',
      fontWeight: 'normal'
    };
    onChange({
      ...config,
      elements: [...config.elements, newEl]
    });
    setSelectedElementId(newEl.id);
  };

  const removeElement = (id: string) => {
    onChange({
      ...config,
      elements: config.elements.filter(el => el.id !== id)
    });
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const selectedElement = config.elements.find(el => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* TOOLBAR */}
      <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-3 z-10 shrink-0">
        
        {/* 1. Add Text Button & Background Upload */}
        <div className="flex gap-2">
          <button 
            onClick={addElement} 
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-md transition-colors"
          >
            <Plus size={16} /> បន្ថែមអក្សរ
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadBackground} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingBg}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[13px] font-semibold rounded-md transition-colors border border-indigo-200"
          >
            {uploadingBg ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            ប្ដូរផ្ទៃខាងក្រោយ
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* Selected Element Controls */}
        <div className={`flex flex-wrap items-center gap-3 ${!selectedElement ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Input */}
          <input 
            type="text"
            value={selectedElement?.type === 'text' ? (selectedElement.content || '') : (selectedElement?.src || '')} 
            onChange={e => {
              if (selectedElement) {
                if (selectedElement.type === 'text') {
                  updateElement(selectedElement.id, { content: e.target.value });
                } else {
                  updateElement(selectedElement.id, { src: e.target.value });
                }
              }
            }}
            placeholder={selectedElement?.type === 'image' ? "ភ្ជាប់រូបភាព..." : "វាយអក្សរនៅទីនេះ..."}
            className="w-48 sm:w-64 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            disabled={!selectedElement}
          />
          
          {/* Font Selector */}
          <select 
            value={selectedElement?.fontFamily || 'Kantumruy Pro'} 
            onChange={e => selectedElement && updateElement(selectedElement.id, { fontFamily: e.target.value })} 
            className="w-40 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            disabled={!selectedElement || selectedElement.type === 'image'}
          >
            <option value="Kantumruy Pro">Kantumruy Pro</option>
            <option value="Moul">Moul</option>
            <option value="Khmer OS Muol Light">Khmer OS Muol Light</option>
            <option value="Siemreap">Siemreap</option>
          </select>

          {/* Size */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-md overflow-hidden h-[34px]">
            <span className="px-2 text-[12px] text-slate-500 border-r border-slate-300 flex items-center h-full bg-slate-100">Size</span>
            <input 
              type="number" 
              value={selectedElement?.fontSize || 16} 
              onChange={e => selectedElement && updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 16 })} 
              className="w-12 bg-transparent border-none p-1 text-[13px] text-center focus:outline-none"
              disabled={!selectedElement || selectedElement.type === 'image'}
            />
          </div>

          {/* Color */}
          <div 
            className="flex items-center justify-center border border-slate-300 rounded-md w-[34px] h-[34px] relative cursor-pointer overflow-hidden shadow-sm" 
            style={{ backgroundColor: selectedElement?.color || '#000000' }}
          >
            <input 
              type="color" 
              value={selectedElement?.color || '#000000'} 
              onChange={e => selectedElement && updateElement(selectedElement.id, { color: e.target.value })} 
              className="absolute inset-[-10px] w-12 h-12 p-0 border-0 cursor-pointer opacity-0"
              disabled={!selectedElement || selectedElement.type === 'image'}
            />
          </div>

          {/* Alignment */}
          <div className="flex bg-slate-50 border border-slate-300 rounded-md overflow-hidden h-[34px]">
            <button 
              onClick={() => selectedElement && updateElement(selectedElement.id, { textAlign: 'left' })}
              className={`px-2 flex items-center justify-center transition-colors ${selectedElement?.textAlign === 'left' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}
              disabled={!selectedElement || selectedElement.type === 'image'}
            >
              <AlignLeft size={16} />
            </button>
            <button 
              onClick={() => selectedElement && updateElement(selectedElement.id, { textAlign: 'center' })}
              className={`px-2 border-l border-r border-slate-300 flex items-center justify-center transition-colors ${selectedElement?.textAlign === 'center' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}
              disabled={!selectedElement || selectedElement.type === 'image'}
            >
              <AlignCenter size={16} />
            </button>
            <button 
              onClick={() => selectedElement && updateElement(selectedElement.id, { textAlign: 'right' })}
              className={`px-2 flex items-center justify-center transition-colors ${selectedElement?.textAlign === 'right' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}
              disabled={!selectedElement || selectedElement.type === 'image'}
            >
              <AlignRight size={16} />
            </button>
          </div>

          {/* Delete Button */}
          <button 
            onClick={() => selectedElement && removeElement(selectedElement.id)} 
            disabled={!selectedElement}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold rounded-md transition-colors"
          >
            <Trash2 size={14} /> លុប
          </button>
        </div>

        <div className="flex-1 min-w-[20px]"></div>

        {/* Zoom Selector */}
        <div className="flex items-center bg-slate-50 border border-slate-300 rounded-md overflow-hidden h-[34px]">
          <span className="px-2 text-[12px] text-slate-500 border-r border-slate-300 flex items-center h-full bg-slate-100">Zoom</span>
          <select 
            value={zoomMode}
            onChange={(e) => setZoomMode(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}
            className="bg-transparent border-none px-2 text-[13px] h-full focus:outline-none cursor-pointer"
          >
            <option value="fit">Fit to Screen</option>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100% (True Size)</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
          </select>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-md transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
              រក្សាទុកគំរូនេះ
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold rounded-md transition-colors border border-slate-300 shadow-sm"
            >
              <RotateCcw size={16} /> 
              ត្រឡប់ដើម
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(config, null, 2));
              alert('Copied Template JSON to clipboard! Paste it to me so I can set it as default.');
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-md transition-colors shadow-sm"
          >
            <Info size={16} /> 
            Export JSON
          </button>
        </div>
      </div>

      {/* CANVAS WORKSPACE */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative p-8 bg-slate-800"
        onClick={() => setSelectedElementId(null)}
      >
        <div 
          style={{
            width: A4_WIDTH * currentScale,
            height: A4_HEIGHT * currentScale,
            position: 'relative',
            margin: '0 auto',
            flexShrink: 0,
          }}
        >
          <div 
            style={{
              width: A4_WIDTH,
              height: A4_HEIGHT,
              transform: `scale(${currentScale})`,
              transformOrigin: 'top left',
              backgroundColor: 'white',
              position: 'absolute',
              top: 0,
              left: 0,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()} 
          >
          {/* Background */}
          {config.background_image_url && (
            <img 
              src={getImageUrl(config.background_image_url)} 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-50"
            />
          )}

          {/* Draggable Elements */}
          {config.elements.map(el => (
            <Rnd
              key={el.id}
              scale={currentScale}
              position={{ x: el.x, y: el.y }}
              size={{ width: el.width, height: el.height }}
              onDragStop={(e, d) => updateElement(el.id, { x: d.x, y: d.y })}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateElement(el.id, {
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position,
                });
              }}
              onClick={(e: any) => {
                e.stopPropagation();
                setSelectedElementId(el.id);
              }}
              className={`${selectedElementId === el.id ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50/20' : 'hover:ring-1 hover:ring-slate-300'} transition-shadow cursor-move`}
              style={{ zIndex: selectedElementId === el.id ? 50 : 10 }}
              dragHandleClassName="handle"
              bounds="parent"
            >
              <div className="w-full h-full relative group">
                <div className="handle absolute -top-3 -left-3 w-6 h-6 bg-blue-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-move transition z-50">
                  <GripHorizontal size={14} />
                </div>
                
                {el.type === 'text' && (
                  <div style={{
                    fontFamily: el.fontFamily,
                    fontSize: el.fontSize,
                    color: el.color,
                    textAlign: el.textAlign,
                    fontWeight: el.fontWeight,
                    width: '100%',
                    height: '100%',
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                    border: el.id === 'el-photo' ? '1px solid black' : 'none'
                  }}>
                    <div style={{ width: '100%' }}>
                      {formatEditorText(el.content || '')}
                    </div>
                  </div>
                )}
                {el.type === 'image' && (
                  <img 
                    src={getImageUrl(el.src)} 
                    alt="" 
                    className="w-full h-full object-contain pointer-events-none" 
                    style={{ border: el.id === 'el-photo' ? '1px solid black' : 'none' }}
                  />
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>
    </div>

      {/* FOOTER */}
      <div className="bg-slate-50 border-t border-slate-200 py-2.5 px-4 flex items-center justify-center text-[12px] text-slate-500 shrink-0 shadow-inner">
        <Info size={14} className="mr-2 text-slate-400" />
        បញ្ជាក់៖ លោកគ្រូអ្នកគ្រូអាចទាញអក្សរចុះឡើងដោយសេរី។ ប្រើប្រាស់អក្សរជំនួសដូចជា
        <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mx-1">{'{{student_name}}'}</code>
        <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mr-1">{'{{gender}}'}</code>
        <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded mr-1">{'{{grade_rank}}'}</code>
        ជាដើម។
      </div>
    </div>
  );
}
