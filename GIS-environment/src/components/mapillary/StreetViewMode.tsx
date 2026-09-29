import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type { MapillaryImage } from '../../services/mapillaryService';

interface StreetViewModeProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: MapillaryImage | null;
  allImages: MapillaryImage[];
  onSelectImage: (img: MapillaryImage) => void;
  locationName?: string | null;
  statusMessage?: string | null;
  loading?: boolean;
}

export const StreetViewMode: React.FC<StreetViewModeProps> = ({
  isOpen,
  onClose,
  currentImage,
  allImages,
  onSelectImage,
  locationName,
  statusMessage,
  loading = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoading, setImgLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setImgLoading(true);
  }, [currentImage?.id]);

  if (!isOpen) return null;

  const currentIndex = currentImage ? allImages.findIndex((img) => img.id === currentImage.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allImages.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectImage(allImages[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectImage(allImages[currentIndex + 1]);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.5, 3.5));
  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const imageUrl = currentImage?.thumb2048Url || currentImage?.thumb1024Url;

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950 flex flex-col overflow-hidden text-slate-100 animate-in fade-in duration-200">
      {/* Immersive Top Bar */}
      <div className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        {/* Exit Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-bold text-xs font-mono transition-all shadow-lg group cursor-pointer"
            title="Exit Street View and return to 3D GIS Map"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-1 transition-transform" />
            <span>Exit Street View</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold font-mono text-slate-100">
                {locationName || 'Street View Mode'}
              </span>
              {currentImage && (
                <span className="text-[10px] font-mono text-slate-400">
                  {currentImage.latitude.toFixed(5)}°, {currentImage.longitude.toFixed(5)}°
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status / Badge Info */}
        <div className="flex items-center gap-3">
          <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <ShieldCheck className="w-3 h-3" /> SECURE MAPILLARY PROXY
          </span>

          <a
            href={currentImage ? `https://www.mapillary.com/app/?p=${currentImage.latitude}/${currentImage.longitude}&focus=photo&pKey=${currentImage.id}` : 'https://www.mapillary.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-mono text-sky-400 hover:text-sky-300 hover:underline"
          >
            <span>Imagery &copy; Mapillary</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Street View Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      >
        {/* Loading Spinner */}
        {(loading || (imageUrl && imgLoading)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3 font-mono text-xs text-sky-400 animate-in fade-in">
            <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>Fetching live Mapillary street surroundings...</span>
          </div>
        )}

        {/* Render High-Res Street Imagery */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Mapillary street imagery ${currentImage?.id}`}
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        ) : (
          !loading && (
            <div className="max-w-md p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl text-center flex flex-col items-center gap-4 animate-in zoom-in-95">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1.5 font-mono">
                <h4 className="text-sm font-bold text-slate-100">No Street Imagery Nearby</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {statusMessage || "Street imagery isn't available near this exact map location. Try moving the map to a nearby road or major city street."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-mono transition-all shadow-lg"
              >
                Return to 3D GIS Map
              </button>
            </div>
          )
        )}

        {/* Road Navigation Controls (Previous / Next Sequence Frames) */}
        {imageUrl && allImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-slate-950/80 hover:bg-sky-950 border border-slate-700 hover:border-sky-400 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-2xl group"
              title="Step Backward along Road"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-slate-950/80 hover:bg-sky-950 border border-slate-700 hover:border-sky-400 text-white disabled:opacity-30 disabled:pointer-events-none transition-all z-20 shadow-2xl group"
              title="Step Forward along Road"
            >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}

        {/* Floating Zoom Controls Toolbar */}
        {imageUrl && (
          <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 p-2 rounded-2xl z-20 shadow-2xl backdrop-blur-md">
            <button
              onClick={handleZoomIn}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetView}
                className="p-2 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded-xl transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Metadata Bar */}
      {currentImage && (
        <div className="h-12 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300 shrink-0 z-30">
          <div className="flex items-center gap-6">
            {currentImage.capturedAt && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{currentImage.capturedAt}</span>
              </span>
            )}
            {currentImage.creator && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <User className="w-4 h-4 text-purple-400" />
                <span>{currentImage.creator}</span>
              </span>
            )}
            {currentImage.compassAngle !== undefined && currentImage.compassAngle !== null && (
              <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{Math.round(currentImage.compassAngle)}° Heading</span>
              </span>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="text-slate-400">
              Sequence Capture <span className="font-bold text-sky-300">{currentIndex + 1}</span> / {allImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
