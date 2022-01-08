import "./style.css"

import Color, { getLuminance } from "./Color";
import { voronoi } from "d3-voronoi";
import { polygonCentroid } from "d3-polygon";
import SimplexNoise from "simplex-noise";
import getRandomPalette from "./getRandomPalette";


const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const OPTS = {
    approximationScale: 0.1,
    angleTolerance: 0.9
};

const MAX_LINE = 8;


function wrap(number)
{
    const n = number/TAU - (number/TAU | 0);
    return n < 0 ? TAU + n * TAU : n * TAU;
}

const black = new Color(0,0,0)

function sortByLightness(palette, limit = 12000)
{

    const a = palette.map(c => {
        const color = Color.from(c);
        return {
            color,
            lum: getLuminance(color)
        };
    })

    a.sort((a,b) => a.lum - b.lum)

    if (a[0].lum < limit)
    {
        const { color } = a[0|Math.random() * a.length]

        const result = color.mix(black, 0.25);
        //console.log("Modified luminance", Math.round(getLuminance(result)))
        a[0].color = result
    }
    return a.map(a => a.color.toRGBHex());
}


const getSaturation = a => {
    const la = (1 / 2) * (Math.max(a.r, a.g, a.b) + Math.min(a.r, a.g, a.b))
    let sa;
    if (la === 1)
    {
        sa = 0
    }
    else
    {
        sa = (Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b)) / (1 - Math.abs(2 * la - 1))
    }
};


function sortBySaturation(palette)
{

    const a = palette.map(c => Color.from(c))

    a.sort((a,b) => {
        return getSaturation(b) - getSaturation(a);

    })
    return a.map(a => a.toRGBHex());
}



const config = {
    width: 0,
    height: 0
};


/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

const tweak = 4

const randomCount = 90
const pickCount = 90

const leafWidthMultiplier = 20
function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function key(x2, y2)
{
    return x2 + "/" + y2;
}

function angleBetweenVectors(x1,y1,x2,y2,x3,y3)
{
    const vx0 = x1 - x2
    const vy0 = y1 - y2
    const vx1 = x3 - x2
    const vy1 = y3 - y2

    return TAU/2 - Math.acos((vx0 * vx1 + vy0 * vy1) / (Math.sqrt(vx0*vx0+vy0*vy0) * Math.sqrt(vx1*vx1+vy1*vy1)))
}

let noise, leafWidthPower, leafCap, logo


const shadow = Color.from("#00251a")
const plant = Color.from("#009648")
const light = Color.from("#fffac7")
const tmp = Color.from("#000")

let env

function colorize(image, logoColor)
{
    const { width, height } = config
    const logoCanvas = document.createElement("canvas")

    logoCanvas.width = image.width
    logoCanvas.height = image.height

    const logoCtx = logoCanvas.getContext("2d");

    logoCtx.clearRect(0,0,image.width, image.height)

    logoCtx.drawImage(image, 0,0)

    logoCtx.globalCompositeOperation = "source-atop"
    logoCtx.fillStyle = logoColor
    logoCtx.fillRect(0,0, image.width, image.height)

    return logoCanvas;
}


function drawLogoAndStruts(logoColor, strutsColor = "rgba(0,0,0,0.8)")
{

    const { width, height } = config
    const cx = width/2
    const cy = height/2

    const bg = document.createElement("canvas")

    bg.width = width
    bg.height = height

    const bgCtx = bg.getContext("2d");

    bgCtx.clearRect(0,0,width, height)

    const logo = colorize(document.getElementById("logo"), logoColor);

    const aspect = logo.width / logo.height

    const sw = width * 0.75
    const sh = height * 0.75
    const screenAspect = sw/sh

    let w, h
    if (aspect >= screenAspect)
    {
        const scale = sw / logo.width
        w = logo.width * scale
        h = logo.height * scale
    }
    else
    {
        const scale = sh / logo.height
        w = logo.width * scale
        h = logo.height* scale
    }



    const struts = 4 + Math.random() * 8

    bgCtx.fillStyle = strutsColor
    for (let i = 0; i < struts; i++)
    {
        const h = Math.random() < 0.3;

        const size = Math.round(24 + Math.random() * 12)

        if (h)
        {
            const y = 0|(Math.random() * height)
            bgCtx.fillRect(0,y,width,size)
        }
        else
        {
            const x = 0|(Math.random() * width)
            bgCtx.fillRect(x,0, size, height)
        }

    }
    bgCtx.drawImage(logo, cx - w/2, cy - h/2, w, h )


    return bg

}

window.onload = (
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;



        const cx = width/2
        const cy = height/2

        const getRandomPoints = num => {
            const { width, height } = config

            const size = 0.84

            const w = width * size
            const h = height * size

            const { data } = logo.getContext("2d").getImageData(0,0,width, height)

            let pts = []
            do
            {
                const x = Math.round(cx - w / 2 + Math.random() * w);
                const y = Math.round(cy - h / 2 + Math.random() * h);

                const off = (y * width + x) * 4

                if (data[off + 3] > 128)
                {
                    pts.push([
                        x,
                        y
                    ])
                }

            } while (pts.length < num * 2)

            const v = voronoi().extent([[0, 0], [width, height]])

            const relaxCount = 4;

            for (let i=0; i < relaxCount; i++)
            {
                const diagram = v(pts);
                const polygons = diagram.polygons();
                pts = polygons.map(poly => poly && polygonCentroid(poly));
            }

            const diagram = v(pts.filter(p => !!p).map(p => [Math.round(p[0]), Math.round(p[1])]));

            if (diagram.cells.length === 0)
            {
                return getRandomPoints(num)
            }

            return diagram;
        };



        ctx.lineWidth = 2 * tweak;

        let arcs = []
        const arc = (x2, y2, x3, y3, clockwise, bg) => {
            const mx = (x2 + x3) / 2
            const my = (y2 + y3) / 2

            const dx = x3 - x2
            const dy = y3 - y2
            const r = Math.sqrt(dx * dx + dy * dy)/2

            const sa = Math.atan2(my - y2, mx - x2);
            const ea = Math.atan2(my - y3, mx - x3);

            // ctx.beginPath()
            // ctx.arc(mx, my, r, sa, ea, clockwise)
            // ctx.stroke()


            arcs.push({mx, my, r, sa, ea, clockwise, bg})
        };


        function buildArcs()
        {

            const palette = getRandomPalette();

            const byLightness = sortByLightness(palette);

            const bySaturation = sortBySaturation(palette).slice(0,-2);

            const bgColor0 = byLightness[0];
            const bgColor1 = byLightness[1];

            const logoColor = bySaturation[0|Math.random()*bySaturation.length]

            noise = new SimplexNoise()

            leafWidthPower = 1 + Math.random() * 0.3
            ctx.lineCap = Math.random() < 0.5 ? "round" : "butt"

            arcs = []

            const gradient = ctx.createLinearGradient(0,0,0,height);

            gradient.addColorStop(0, bgColor1)
            gradient.addColorStop(1, bgColor0)

            ctx.fillStyle = gradient
            ctx.fillRect(0,0, width, height);

            env = Color.from(bgColor0).mix(Color.from(bgColor1), 0.5);
            logo = drawLogoAndStruts(logoColor)

            ctx.drawImage(logo, 0, 0)

            let prevX = null, prevY = null

            const diagram = getRandomPoints(randomCount);
            const { edges, cells } = diagram

            let curr;
            let idx = 0
            do {
                curr = cells[idx++]
            } while(!curr && idx < cells.length)

            if (!curr)
            {
                throw new Error("No cells?")
            }

            const visited = new Set()


            let clockwise = true;
            for (let i = 0; i < pickCount; i++)
            {
                const {site, halfedges} = curr;

                const exits = halfedges.map(
                    h => {
                        const edge = edges[h];
                        return edge.left[0] === site[0] && edge.left[1] === site[1] ? edge.right : edge.left
                    }
                )
                    .filter(
                        s => !!s
                    )

                const nonVisited = exits.filter(
                    s => !visited.has(key(s[0], s[1]))
                )

                let sites;
                let bg = false;
                if (nonVisited.length)
                {
                    sites = nonVisited;
                }
                else
                {
                    sites = exits;
                    bg = true
                }

                const next = sites[0 | Math.random() * sites.length]

                const x2 = site[0]
                const y2 = site[1]
                const x3 = next[0]
                const y3 = next[1]

                visited.add(key(x3, y3))

                let v = 255;
                if (prevX !== null)
                {
                    const result = angleBetweenVectors(prevX, prevY, x2, y2, x3, y3)

                    if (result >= (15 * TAU / 360))
                    {

                        let dx;
                        let dy;
                        if (clockwise)
                        {
                            dx = (y2 - (prevY + y3) / 2);
                            dy = -(x2 - (prevX + x3) / 2);

                        }
                        else
                        {
                            dx = -(y2 - (prevY + y3) / 2);
                            dy = (x2 - (prevX + x3) / 2);
                        }

                        if (result <= (60 * TAU / 360))
                        {
                            arc(x2, y2, x2 + dx * 0.618, y2 + dy * 0.618, clockwise, bg);
                            arc(x2 + dx * 0.618, y2 + dy * 0.618, x2, y2, clockwise, bg);
                        }
                        else
                        {
                            dx *= 0.618
                            dy *= 0.618

                            const d = Math.sqrt(dx * dx + dy * dy)

                            const angle = Math.atan2(-dy, -dx)

                            const x4 = x2 + dx + Math.cos(angle - TAU / 6) * d
                            const y4 = y2 + dy + Math.sin(angle - TAU / 6) * d
                            const x5 = x2 + dx + Math.cos(angle + TAU / 6) * d
                            const y5 = y2 + dy + Math.sin(angle + TAU / 6) * d

                            arc(x2, y2, x4, y4, clockwise, bg);
                            arc(x4, y4, x5, y5, clockwise, bg);
                            arc(x5, y5, x2, y2, clockwise, bg);

                            clockwise = !clockwise
                        }

                        // ctx.strokeStyle = "#f00"
                        // ctx.beginPath()
                        // ctx.moveTo(x2,y2)
                        // ctx.lineTo(x2 + dx * 0.618, y2 + dy * 0.618)
                        // ctx.stroke()

                    }

                }
                arc(x2, y2, x3, y3, clockwise, bg);

                curr = cells.find(cell => cell.site[0] === next[0] && cell.site[1] === next[1]);

                clockwise = !clockwise

                prevX = x2
                prevY = y2

            }

            pos = -1;
            finePos = 0;


            angle = 0;
            step = 0;

            running = true

        }


        let pos = -1;
        let finePos = 0;

        const speed = 0.05

        let angle = 0;
        let step = 0;

        let running = true

        const animate = () => {

            if (finePos-- <= 0)
            {
                if (pos >= arcs[arcs.length - 1])
                {
                    running = false
                }
                else
                {
                    const { sa, ea, clockwise, bg } = arcs[++pos]

                    const delta = Math.abs(ea - sa)
                    angle = ea
                    step = speed * (clockwise ? -1: 1)
                    finePos = Math.floor(delta/speed)
                }
            }

            if (running)
            {
                const { mx, my, sa : oea, r, clockwise,w } = arcs[pos]

                const sa = wrap(angle)
                angle += step
                const ea = finePos === 0 ? oea: wrap(angle + step)

                const x0 = mx + Math.cos(sa) * r;
                const y0 = my + Math.sin(sa) * r;

                const ns = 0.01

                const v = 0.5 + 0.5 * Math.cos(sa + TAU/8)

                shadow.mix(plant, v, tmp)
                tmp.mix(env,  0.3, tmp)
                tmp.mix(light,  0.1 + 0.1 * noise.noise3D(x0 * ns , y0 * ns, 0), tmp)

                ctx.strokeStyle = tmp.toRGBHex()
                const rnd = 0.5 + 0.5 * noise.noise3D(x0 * ns, y0 * ns, pos * ns);
                ctx.lineWidth = 0 | (1 + (Math.pow(rnd,leafWidthPower)) * leafWidthMultiplier)
                ctx.beginPath()
                ctx.moveTo(x0, y0)
                ctx.lineTo(mx + Math.cos(ea) * r,my + Math.sin(ea) * r)
                ctx.stroke()


            }
        }
        const paint = () => {

            //ctx.strokeStyle = "#0B8F37"

            for (let i=0; i < 12 && running; i++)
            {
                animate()
            }

            if (running)
            {
                requestAnimationFrame(paint)
            }
        }


        buildArcs();

        canvas.addEventListener("click", () => {

            if (running)
            {
                running = false

            }
            window.setTimeout( () => {
                buildArcs()
                requestAnimationFrame(paint)

            }, 20)

        }, false)

        requestAnimationFrame(paint)
    }

);
