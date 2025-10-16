/**
 * Photo Capture Component
 * Captures and uploads photos during inspections
 */

'use client';

import { useState, useRef } from 'react';

interface PhotoCaptureProps {
  stopId: string;
  onPhotoCapture: (photo: CapturedPhoto) => void;
  maxPhotos?: number;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  size: number;
}

export function PhotoCapture({ stopId, onPhotoCapture, maxPhotos = 5 }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('გთხოვთ აირჩიოთ სურათი');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const photo: CapturedPhoto = {
        id: `photo-${Date.now()}`,
        dataUrl: event.target?.result as string,
        timestamp: new Date().toISOString(),
        size: file.size,
      };
      
      setPhotos([...photos, photo]);
      onPhotoCapture(photo);
    };
    
    reader.readAsDataURL(file);
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCapturing(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('კამერის წვდომა შეუძლებელია');
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const photo: CapturedPhoto = {
      id: `photo-${Date.now()}`,
      dataUrl,
      timestamp: new Date().toISOString(),
      size: dataUrl.length,
    };
    
    setPhotos([...photos, photo]);
    onPhotoCapture(photo);
    stopCamera();
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCapturing(false);
    }
  };
  
  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };
  
  return (
    <div className="space-y-4">
      <h4 className="font-semibold">ფოტოები ({photos.length}/{maxPhotos})</h4>
      
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.dataUrl}
                alt="Captured"
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
              <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {new Date(photo.timestamp).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Camera view */}
      {capturing && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <button
              onClick={capturePhoto}
              className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-100"
            >
              📸 გადაღება
            </button>
            <button
              onClick={stopCamera}
              className="bg-red-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-red-700"
            >
              ✕ გაუქმება
            </button>
          </div>
        </div>
      )}
      
      {/* Capture buttons */}
      {!capturing && photos.length < maxPhotos && (
        <div className="flex space-x-2">
          <button
            onClick={startCamera}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            📷 კამერა
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
          >
            🖼️ გალერეა
          </button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
