export const generateTextBackground = (text: string): string => {
  if (!text) return '';
  
  const cleanText = text
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]/g, ' ')
    .trim();
  
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  ];
  
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const gradientIndex = Math.abs(hash) % gradients.length;
  const gradient = gradients[gradientIndex];
  
  const svgContent = `
    <svg width="800" height="176" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
          ${gradient.includes('667eea') ? '<stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />' : ''}
          ${gradient.includes('f093fb') ? '<stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" /><stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />' : ''}
          ${gradient.includes('4facfe') ? '<stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" /><stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />' : ''}
          ${gradient.includes('43e97b') ? '<stop offset="0%" style="stop-color:#43e97b;stop-opacity:1" /><stop offset="100%" style="stop-color:#38f9d7;stop-opacity:1" />' : ''}
          ${gradient.includes('fa709a') ? '<stop offset="0%" style="stop-color:#fa709a;stop-opacity:1" /><stop offset="100%" style="stop-color:#fee140;stop-opacity:1" />' : ''}
          ${gradient.includes('30cfd0') ? '<stop offset="0%" style="stop-color:#30cfd0;stop-opacity:1" /><stop offset="100%" style="stop-color:#330867;stop-opacity:1" />' : ''}
          ${gradient.includes('a8edea') ? '<stop offset="0%" style="stop-color:#a8edea;stop-opacity:1" /><stop offset="100%" style="stop-color:#fed6e3;stop-opacity:1" />' : ''}
          ${gradient.includes('ff9a9e') ? '<stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" /><stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />' : ''}
          ${gradient.includes('ffecd2') ? '<stop offset="0%" style="stop-color:#ffecd2;stop-opacity:1" /><stop offset="100%" style="stop-color:#fcb69f;stop-opacity:1" />' : ''}
          ${gradient.includes('ff6e7f') ? '<stop offset="0%" style="stop-color:#ff6e7f;stop-opacity:1" /><stop offset="100%" style="stop-color:#bfe9ff;stop-opacity:1" />' : ''}
        </linearGradient>
      </defs>
      <rect width="800" height="176" fill="url(#grad${hash})"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="32" font-weight="700" 
            fill="white" opacity="0.4" letter-spacing="1">
        ${cleanText.substring(0, 30)}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
};
