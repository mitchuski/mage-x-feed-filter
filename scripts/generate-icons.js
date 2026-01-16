#!/usr/bin/env node
/**
 * Icon Generator for X Feed Filter
 * Run with: node scripts/generate-icons.js
 * 
 * This creates simple shield icons in the required sizes.
 * Requires Node.js with canvas support, or just open generate-icons.html in a browser.
 */

const fs = require('fs');
const path = require('path');

// Check if we have canvas available
let createCanvas;
try {
    createCanvas = require('canvas').createCanvas;
} catch (e) {
    console.log('Canvas module not available.');
    console.log('');
    console.log('To generate icons, either:');
    console.log('1. Install canvas: npm install canvas');
    console.log('2. Or open generate-icons.html in your browser and download the icons');
    console.log('');
    process.exit(0);
}

const iconsDir = path.join(__dirname, '..', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function drawIcon(ctx, size) {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1d9bf0');
    gradient.addColorStop(1, '#0d8ed9');
    
    ctx.fillStyle = gradient;
    
    // Draw shield shape
    ctx.beginPath();
    const cx = size / 2;
    const top = size * 0.08;
    const bottom = size * 0.92;
    const width = size * 0.8;
    
    ctx.moveTo(cx, top);
    ctx.lineTo(cx + width/2, top + size * 0.15);
    ctx.lineTo(cx + width/2, size * 0.5);
    ctx.quadraticCurveTo(cx + width/2, bottom - size * 0.1, cx, bottom);
    ctx.quadraticCurveTo(cx - width/2, bottom - size * 0.1, cx - width/2, size * 0.5);
    ctx.lineTo(cx - width/2, top + size * 0.15);
    ctx.closePath();
    ctx.fill();
    
    // Draw checkmark
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(size * 0.3, size * 0.5);
    ctx.lineTo(size * 0.45, size * 0.65);
    ctx.lineTo(size * 0.7, size * 0.35);
    ctx.stroke();
}

const sizes = [16, 48, 128];

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    drawIcon(ctx, size);
    
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${filename}`);
});

console.log('');
console.log('Icons generated successfully!');

