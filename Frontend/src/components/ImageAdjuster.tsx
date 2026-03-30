import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageAdjusterProps {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // 1 for square, etc.
  isCircle?: boolean;
}

export function ImageAdjuster({ imageSrc, onConfirm, onCancel, aspectRatio = 1, isCircle = false }: ImageAdjusterProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleConfirm = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current.getBoundingClientRect();
    const img = imageRef.current.getBoundingClientRect();

    // Calculate crop area
    canvas.width = container.width * 2; // Higher quality
    canvas.height = container.height * 2;

    ctx.scale(2, 2);
    
    // Fill background with white (or transparent if needed)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, container.width, container.height);

    // Draw image based on relative position and zoom
    const drawX = (img.left - container.left);
    const drawY = (img.top - container.top);
    
    ctx.drawImage(
      imageRef.current,
      drawX,
      drawY,
      img.width,
      img.height
    );

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-[2.5rem] overflow-hidden shadow-2xl border border-border">
        <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold">Chỉnh sửa hình ảnh</h3>
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button>
        </div>

        <div className="p-8 flex flex-col items-center gap-8">
            <div 
              ref={containerRef}
              className={`relative overflow-hidden bg-muted border-2 border-dashed border-primary/20 ${isCircle ? 'rounded-full' : 'rounded-2xl'}`}
              style={{ width: '300px', height: `${300 / aspectRatio}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Adjust"
                className="absolute cursor-move select-none max-w-none origin-center"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                draggable={false}
              />
              
              {/* Overlay to show frame better */}
              <div className={`absolute inset-0 pointer-events-none shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] ${isCircle ? 'rounded-full' : ''}`}></div>
            </div>

            <div className="w-full space-y-4">
                <div className="flex items-center gap-4">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <Slider 
                      value={[zoom]} 
                      min={0.5} 
                      max={3} 
                      step={0.01} 
                      onValueChange={([val]) => setZoom(val)} 
                      className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-center text-xs text-muted-foreground font-medium">Kéo chuột để di chuyển, dùng thanh trượt để phóng to/thu nhỏ</p>
            </div>
        </div>

        <div className="p-6 bg-muted/30 border-t border-border flex gap-4">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={onCancel}>Hủy bỏ</Button>
            <Button className="flex-1 rounded-xl h-12 font-bold bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" /> Xong
            </Button>
        </div>
      </div>
    </div>
  );
}
