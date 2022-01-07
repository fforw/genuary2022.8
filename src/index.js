import domready from "domready"
import "./style.css"

import AABB from "./AABB";
import Color from "./Color";
import { voronoi } from "d3-voronoi";
import { polygonCentroid } from "d3-polygon";


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



const config = {
    width: 0,
    height: 0
};


/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

const randomCount = 450
const pickCount = 300


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


domready(
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

            let pts = []
            for (let i = 0; i < num; i++)
            {
                pts.push([
                    Math.round(cx - w/2 + Math.random() * w),
                    Math.round(cy - h/2 + Math.random() * h)
                ])

            }

            const v = voronoi().extent([[0, 0], [width, height]])

            const relaxCount = 5 + Math.random() * 5;

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



        ctx.lineWidth = 2;
        ctx.lineCap = "round"

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
            arcs = []
            ctx.fillStyle = Color.from("#12DE56").mix(Color.from("#16161d"), 0.7 + Math.random() * 0.25).toRGBHex();
            ctx.fillRect(0,0, width, height);

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

        const speed = 0.1

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
                const { mx, my, sa : oea, r, clockwise } = arcs[pos]

                const sa = wrap(angle)
                angle += step
                const ea = finePos === 0 ? oea: wrap(angle + step)

                ctx.beginPath()
                ctx.moveTo(mx + Math.cos(sa) * r,my + Math.sin(sa) * r)
                ctx.lineTo(mx + Math.cos(ea) * r,my + Math.sin(ea) * r)
                ctx.stroke()


            }
        }
        const paint = () => {

            ctx.strokeStyle = "rgba(18,222,86, 0.4)"

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
