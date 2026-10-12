const KEY = 'glass-intensity';

export function applyGlassIntensity(value: number){
    const v = Math.min(1, Math.max(0, value));
    document.documentElement.style.setProperty("--glass-intensity", String(v));
    try{localStorage.setItem(KEY, String(v));} catch{}
}

export function restoreGlassIntensity(){
    try{
        const saved = localStorage.getItem(KEY);
        if(saved !== null) applyGlassIntensity(parseFloat(saved));
    } catch{}
}