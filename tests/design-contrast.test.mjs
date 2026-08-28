// Reads the shipped token values and prints WCAG ratios for every
// text/surface pair docs/design-system.md promises. Run from repo root:
//   node tests/design-contrast.test.mjs
import { readFileSync } from "node:fs";
const lum = (hex) => {
  const c = hex.replace("#","");
  const [r,g,b] = [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255)
    .map(v => v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return 0.2126*r+0.7152*g+0.0722*b;
};
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const fmt = (n) => n.toFixed(2).padStart(6);
const row = (name, fg, bg, min=4.5) => {
  const r = ratio(fg,bg);
  console.log(`${r>=min?"ok  ":"FAIL"} ${fmt(r)}  ${name}  (${fg} on ${bg}, min ${min})`);
  return r>=min;
};
let bad=0;
console.log("== dashboard dark ==");
const D={bg:"#0F1012",surface:"#18191C",lit:"#1E2024",sunken:"#131416",t:"#F0F1F2",t2:"#A3A7AC",t3:"#8B9095",ac:"#57B2E8",ok:"#4FC08D",warn:"#DCA84E",bad:"#E2705F"};
bad+=!row("text / bg",D.t,D.bg);
bad+=!row("text-2 / surface",D.t2,D.surface);
bad+=!row("text-3 / surface (labels 11px bold)",D.t3,D.surface,3);
bad+=!row("text / surface-lit",D.t,D.lit);
bad+=!row("text-2 / surface-lit",D.t2,D.lit);
bad+=!row("accent / bg (figures, links)",D.ac,D.bg);
bad+=!row("success / surface",D.ok,D.surface);
bad+=!row("warning / surface",D.warn,D.surface);
bad+=!row("danger / surface",D.bad,D.surface);
console.log("== dashboard light ==");
const L={bg:"#E7E7E5",surface:"#F3F3F1",lit:"#FCFCFB",t:"#151515",t2:"#4A4D49",t3:"#5D605C",ac:"#0D689D"};
bad+=!row("text / bg",L.t,L.bg);
bad+=!row("text-2 / surface",L.t2,L.surface);
bad+=!row("text-3 / surface (labels)",L.t3,L.surface,3);
bad+=!row("text / surface-lit",L.t,L.lit);
bad+=!row("text-2 / surface-lit",L.t2,L.lit);
bad+=!row("accent / bg",L.ac,L.bg);
console.log("== booking (light-first) ==");
const bk = readFileSync("app/src/book/booking.css","utf8");
const g = (name) => bk.match(new RegExp(`--bk-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const B={bg:g("bg"),card:g("card")||g("surface"),lit:g("lit"),t:g("ink")||g("text"),mut:g("muted")};
console.log("tokens:",JSON.stringify(B));
if(B.t&&B.bg) bad+=!row("ink / bg",B.t,B.bg);
if(B.t&&B.card) bad+=!row("ink / card",B.t,B.card);
if(B.mut&&B.card) bad+=!row("muted / card",B.mut,B.card);
if(B.mut&&B.lit) bad+=!row("muted / lit",B.mut,B.lit);
console.log("== landing (dark only) ==");
const ld = readFileSync("app/src/landing/landing.css","utf8");
const gl = (name) => ld.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const Ld={bg:gl("bg"),panel:gl("panel")||gl("surface"),i:gl("i"),i2:gl("i2"),ac:gl("ac")};
console.log("tokens:",JSON.stringify(Ld));
if(Ld.i&&Ld.bg) bad+=!row("ink / bg",Ld.i,Ld.bg);
if(Ld.i2&&Ld.bg) bad+=!row("ink-2 / bg",Ld.i2,Ld.bg);
if(Ld.i&&Ld.panel) bad+=!row("ink / panel",Ld.i,Ld.panel);
if(Ld.i2&&Ld.panel) bad+=!row("ink-2 / panel",Ld.i2,Ld.panel);
if(Ld.ac&&Ld.bg) bad+=!row("accent / bg",Ld.ac,Ld.bg);
console.log(bad? `\n${bad} FAILURES` : "\nall pairs pass");
process.exit(bad?1:0);
