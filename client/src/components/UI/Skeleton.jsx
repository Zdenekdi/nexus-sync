import React from 'react';

/**
 * Premium Skeleton Loader for Nexus Hub
 * Provides a smooth pulsing "ghost" effect for content that is still loading.
 */
const Skeleton = ({ width = '100%', height = '20px', borderRadius = '12px', circle = false, style = {} }) => {
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0% { opacity: 0.2; transform: scale(0.995); }
          50% { opacity: 0.45; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.995); }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.4s ease-in-out infinite;
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.08) 0%, 
            rgba(255, 255, 255, 0.12) 50%, 
            rgba(255, 255, 255, 0.08) 100%
          );
          background-size: 200% 100%;
        }
      `}</style>
      <div 
        className="skeleton-pulse" 
        style={{
          width,
          height: circle ? width : height,
          borderRadius: circle ? '50%' : borderRadius,
          border: '1px solid rgba(255, 255, 255, 0.03)',
          ...style
        }}
      />
    </>
  );
};

export default Skeleton;
