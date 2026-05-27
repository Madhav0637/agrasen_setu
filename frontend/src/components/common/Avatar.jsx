import React from 'react';

export default function Avatar({ src, alt, name, size = 'sm', style = {} }) {
  if (src && src.trim() !== '') {
    return (
      <img 
        src={src} 
        alt={alt || name || 'Avatar'} 
        className={`avatar avatar--${size}`} 
        style={{ objectFit: 'cover', ...style }} 
      />
    );
  }
  
  return (
    <div className={`avatar avatar--${size}`} style={style}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}
