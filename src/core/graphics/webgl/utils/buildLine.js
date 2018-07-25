import { Point } from '../../../math';
import { hex2rgb } from '../../../utils';

/**
 * Builds a line to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 * @param {object} webGLDataNativeLines - an object containing all the webGL-specific information to create nativeLines
 */
export default function (graphicsData, webGLData, webGLDataNativeLines)
{
    if (graphicsData.nativeLines)
    {
        buildNativeLine(graphicsData, webGLDataNativeLines);
    }
    else
    {
        buildLine(graphicsData, webGLData);
    }
}

/**
 * Builds a line to draw using the poligon method.
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 */
function buildLine(graphicsData, webGLData)
{
    console.log('building a line');
    // TODO OPTIMISE!
    let points = graphicsData.points;

    if (points.length === 0)
    {
        return;
    }
    // if the line width is an odd number add 0.5 to align to a whole pixel
    // commenting this out fixes #711 and #1620
    // if (graphicsData.lineWidth%2)
    // {
    //     for (i = 0; i < points.length; i++)
    //     {
    //         points[i] += 0.5;
    //     }
    // }

    // get first and last point.. figure out the middle!
    const firstPoint = new Point(points[0], points[1]);
    let lastPoint = new Point(points[points.length - 2], points[points.length - 1]);

    // if the first point is the last point - gonna have issues :)
    if (firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y)
    {
        // need to clone as we are going to slightly modify the shape..
        points = points.slice();

        points.pop();
        points.pop();

        lastPoint = new Point(points[points.length - 2], points[points.length - 1]);

        const midPointX = lastPoint.x + ((firstPoint.x - lastPoint.x) * 0.5);
        const midPointY = lastPoint.y + ((firstPoint.y - lastPoint.y) * 0.5);

        points.unshift(midPointX, midPointY);
        points.push(midPointX, midPointY);
    }

    let verts = webGLData.points;
    const indices = webGLData.indices;
    const length = points.length / 2;
    let indexCount = points.length;
    let indexStart = verts.length / 6;

    // DRAW the Line
    const width = graphicsData.lineWidth / 2;

    // sort color
    const color = hex2rgb(graphicsData.lineColor);
    const alpha = graphicsData.lineAlpha;
    const r = color[0] * alpha;
    const g = color[1] * alpha;
    const b = color[2] * alpha;

    // FIRST TRIANGLE
    let p1x = points[0];
    let p1y = points[1];
    let p2x = points[2];
    let p2y = points[3];
    let p3x = 0;
    let p3y = 0;

    let perpx = -(p1y - p2y);
    let perpy = p1x - p2x;
    let perp2x = 0;
    let perp2y = 0;
    let perp3x = 0;
    let perp3y = 0;

    let dist = Math.sqrt((perpx * perpx) + (perpy * perpy));

    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    // const ratio = graphicsData.lineAlignment;// 0.5;
    // const r1 = (1 - ratio) * 2;
    // const r2 = ratio * 2;

    // start
    verts.push(
        p1x - perpx,
        p1y - perpy,
        r, g, b, alpha
    );

    verts.push(
        p1x + perpx,
        p1y + perpy,
        r, g, b, alpha
    );

    for (let i = 1; i < length - 1; ++i)
     {
        p1x = points[(i - 1) * 2];
        p1y = points[((i - 1) * 2) + 1];

        p2x = points[i * 2];
        p2y = points[(i * 2) + 1];

        p3x = points[(i + 1) * 2];
        p3y = points[((i + 1) * 2) + 1];

        perpx = -(p1y - p2y);
        perpy = p1x - p2x;

        dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
        perpx /= dist;
        perpy /= dist;
        perpx *= width;
        perpy *= width;

        perp2x = -(p2y - p3y);
        perp2y = p2x - p3x;

        dist = Math.sqrt((perp2x * perp2x) + (perp2y * perp2y));
        perp2x /= dist;
        perp2y /= dist;
        perp2x *= width;
        perp2y *= width;

        const a1 = (-perpy + p1y) - (-perpy + p2y);
        const b1 = (-perpx + p2x) - (-perpx + p1x);
        const c1 = ((-perpx + p1x) * (-perpy + p2y)) - ((-perpx + p2x) * (-perpy + p1y));
        const a2 = (-perp2y + p3y) - (-perp2y + p2y);
        const b2 = (-perp2x + p2x) - (-perp2x + p3x);
        const c2 = ((-perp2x + p3x) * (-perp2y + p2y)) - ((-perp2x + p2x) * (-perp2y + p3y));

        let denom = (a1 * b2) - (a2 * b1);

        if (Math.abs(denom) < 0.1)
        {
            denom += 10.1;
            verts.push(
                p2x - (perpx),
                p2y - (perpy),
                r, g, b, alpha
            );

            verts.push(
                p2x + (perpx),
                p2y + (perpy),
                r, g, b, alpha
            );

            continue;
        }

        const px = ((b1 * c2) - (b2 * c1)) / denom;
        const py = ((a2 * c1) - (a1 * c2)) / denom;
        const pdist = ((px - p2x) * (px - p2x)) + ((py - p2y) * (py - p2y));

        // TODO JP: can set mitre limit here, might break other things though?
        if (pdist > (15 * width * width))
        {
            perp3x = perpx - perp2x;
            perp3y = perpy - perp2y;

            dist = Math.sqrt((perp3x * perp3x) + (perp3y * perp3y));
            perp3x /= dist;
            perp3y /= dist;
            perp3x *= width;
            perp3y *= width;

            const p01 = { x: p2x - (perp3x), y: p2y - (perp3y) };
            const p02 = { x: p2x + (perp3x), y: p2y + (perp3y) };
            const p03 = { x: p2x - (perp3x), y: p2y - (perp3y) };

            verts.push(p2x - (perp3x ), p2y - (perp3y));
            verts.push(r, g, b, alpha);

            verts.push(p2x + (perp3x), p2y + (perp3y));
            verts.push(r, g, b, alpha);

            verts.push(p2x - (perp3x), p2y - (perp3y));
            verts.push(r, g, b, alpha);

            indexCount++;

            let addedVertCount = createRoundCap(midPoint(p01, p02), p01, p02, p03, verts);
            console.log(addedVertCount);
            while(addedVertCount > 0) {
                indexCount+=5;
                addedVertCount--;
            }
        }
        else
        {
            verts.push(p2x + ((px - p2x)), p2y + ((py - p2y)));
            verts.push(r, g, b, alpha);

            verts.push(p2x - ((px - p2x)), p2y - ((py - p2y)));
            verts.push(r, g, b, alpha);
        }
    }

    // LAST TRIANGLE

    p1x = points[(length - 2) * 2];
    p1y = points[((length - 2) * 2) + 1];

    p2x = points[(length - 1) * 2];
    p2y = points[((length - 1) * 2) + 1];

    perpx = -(p1y - p2y);
    perpy = p1x - p2x;

    dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    verts.push(p2x - (perpx), p2y - (perpy));
    verts.push(r, g, b, alpha);

    verts.push(p2x + (perpx), p2y + (perpy));
    verts.push(r, g, b, alpha);

    indices.push(indexStart);

    // Add roundcap to the start and end of the line.
    // const p00 = { x: verts[6], y: verts[6 + 1] };
    // const p01 = { x: verts[12], y: verts[12 + 1] };
    // const p02 = { x: points[2], y: points[3] };
    // let addedVertCount = createRoundCap(
    //     { x: points[0], y: points[1] }, p00, p01, p02, verts
    // );
    // while(addedVertCount > 0) {
    //     indices.push(indexStart++);
    //     addedVertCount--;
    // }

    for (let i = 0; i < indexCount; ++i)
    {
        indices.push(indexStart++);
    }

    // TODO TRYING TO ADD END CAP

    // const p10 = { x: verts[verts.length - 6], y: verts[verts.length - 5] };
    // const p11 = { x: verts[verts.length - 12], y: verts[verts.length - 11] };
    // const p12 = { x: points[points.length - 4], y: points[points.length - 3] };
    // let addedVertCount = createRoundCap(
    //     { x: points[points.length - 2], y: points[points.length - 1] }, p10, p11, p12, verts
    // );
    // while(addedVertCount > 0) {
    //     indices.push(indexStart++);
    //     addedVertCount--;
    // }

    indices.push(indexStart - 1);
}


export function perpendicular(x, y) {
    return { x: -y, y: x };
}

export function invert(x, y) {
    return { x: -x, y: -y };
}

export function normalize(x, y) {
    const mod = toLength(x, y);
    return { x: x / mod, y: y / mod };
}

export function toLength(x, y) {
    return Math.sqrt((x * x) + (y * y));
}

export function multiplyPoint(x, y, times) {
    return { x: x * times, y: y * times };
}

export function midPoint(p1, p2) {
    const add = addPoints(p1, p2);
    return multiplyPoint(add.x, add.y, 0.5);
}

export function addPoints(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}


const EPSILON = 0.0001;
export function createRoundCap(center, _p0, _p1, nextPointInLine, vertices) {
    const outerRadiusPoint = subtractPoints(center, _p0);
    const radius = toLength(outerRadiusPoint.x, outerRadiusPoint.y);

    let angle0 = Math.atan2((_p1.y - center.y), (_p1.x - center.x));
    let angle1 = Math.atan2((_p0.y - center.y), (_p0.x - center.x));

    const originalAngle0 = angle0;

    if (angle1 > angle0) {
        if (angle1 - angle0 >= Math.PI - EPSILON) {
            angle1 = angle1 - (2 * Math.PI);
        }
    } else {
        if (angle0 - angle1 >= Math.PI - EPSILON) {
            angle0 = angle0 - (2 * Math.PI);
        }
    }

    let angleDiff = angle1 - angle0;

    if (Math.abs(angleDiff) >= Math.PI - EPSILON && Math.abs(angleDiff) <= Math.PI + EPSILON) {
        let r1 = subtractPoints(center, nextPointInLine);
        if (r1.x === 0) {
            if (r1.y > 0) {
                angleDiff = -angleDiff;
            }
        } else if (r1.x >= -EPSILON) {
            angleDiff = -angleDiff;
        }
    }

    const nsegments = Math.min(Math.abs(angleDiff * radius), 10) + 1;
    const angleInc = angleDiff / nsegments;

    for (let i = 0; i < nsegments; i++) {
        vertices.push(center.x, center.y);
        vertices.push(0, 25, 0, 1);
        vertices.push(
            center.x + radius * Math.cos(originalAngle0 + angleInc * (i)),
            center.y + radius * Math.sin(originalAngle0 + angleInc * (i)),
        );
        vertices.push(0, 25, 0, 1);
        vertices.push(
            center.x + radius * Math.cos(originalAngle0 + angleInc * (i + 1)),
            center.y + radius * Math.sin(originalAngle0 + angleInc * (i + 1)),
        );
        vertices.push(0, 0, 25, 1);
    }
    return nsegments;
}


/**
 * Builds a line to draw using the gl.drawArrays(gl.LINES) method
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 */
function buildNativeLine(graphicsData, webGLData)
{
    let i = 0;
    const points = graphicsData.points;

    if (points.length === 0) return;

    let verts = webGLData.points;
    const length = points.length / 2;

    // sort color
    const color = hex2rgb(graphicsData.lineColor);
    const alpha = graphicsData.lineAlpha;
    const r = color[0] * alpha;
    const g = color[1] * alpha;
    const b = color[2] * alpha;

    for (i = 1; i < length; i++)
    {
        const p1x = points[(i - 1) * 2];
        const p1y = points[((i - 1) * 2) + 1];

        const p2x = points[i * 2];
        const p2y = points[(i * 2) + 1];

        const p3x = points[(i + 1) * 2];
        const p3y = points[((i + 1) * 2) + 1];

        verts.push(p1x, p1y);
        verts.push(r, g, b, alpha);

        verts.push(p2x, p2y);
        verts.push(r, g, b, alpha);

        // const p01 = { x: p1x, y: p1y };
        // const p02 = { x: p2x, y: p2y };
        // const p03 = { x: p3x, y: p3y };
        // createRoundCap(midPoint(p01, p02), p01, p02, p03, verts);
    }

    // const p01 = { x: points[0], y: points[1] };
    // const p02 = { x: points[2], y: points[3] };
    // const p03 = { x: points[4], y: points[5] };
    // createRoundCap(midPoint(p01, p02), p01, p02, p03, verts);
}


function buildNativeLine2(graphicsData, webGLData)
{
    let i = 0;
    const points = graphicsData.points;

    if (points.length === 0) return;

    const verts = webGLData.points;
    const length = points.length / 2;

    // sort color
    const color = hex2rgb(graphicsData.lineColor);
    const alpha = graphicsData.lineAlpha;
    const r = color[0] * alpha;
    const g = color[1] * alpha;
    const b = color[2] * alpha;

    for (i = 1; i < length; i++)
    {
        const p1x = points[(i - 1) * 2];
        const p1y = points[((i - 1) * 2) + 1];

        const p2x = points[i * 2];
        const p2y = points[(i * 2) + 1];

        verts.push(p1x, p1y);
        verts.push(r, g, b, alpha);

        verts.push(p2x, p2y);
        verts.push(r, g, b, alpha);
    }
}

export function pointsArrayToObjects(points) {
    const pointObjects = [];
    for (let i = 0; i < points.length; i += 2) {
        pointObjects.push({
            x: points[i],
            y: points[i + 1],
        });
    }
    return pointObjects;
}

export function createLineFromPoints(points) {
    if (points.length < 2) {
        return;
    }

    let radius = 3;
    let vertices = [];
    let middlePoints = [];  // middle points per each line segment.

    if (points.length === 2) {
        // Straight line
        // createTriangles(points[0], midPoint(points[0], points[1]), points[1], radius, vertices);
    } else {
        if (points[0] === points[points.length - 1] ||
            (points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y)) {
            let p0 = points.shift();
            p0 = midPoint(p0, points[0]);
            points.unshift(p0);
            points.push(p0);
        }
        let i;
        for (i = 0; i < points.length - 1; i++) {
            if (i === 0) {
                middlePoints.push(points[0]);
            } else if (i === points.length - 2) {
                middlePoints.push(points[points.length - 1])
            } else {
                middlePoints.push(midPoint(points[i], points[i + 1]));
            }
        }
        for (i = 1; i < middlePoints.length; i++) {
            // createTriangles(middlePoints[i - 1], points[i], middlePoints[i], radius, vertices);
        }
    }

    const p00 = vertices[0];
    const p01 = vertices[1];
    const p02 = points[1];
    const p10 = vertices[vertices.length - 1];
    const p11 = vertices[vertices.length - 3];
    const p12 = points[points.length - 2];
    //
    // // Add roundcap to the start and end of the line.
    // createRoundCap(points[0], p00, p01, p02, vertices);
    // createRoundCap(points[points.length - 1], p10, p11, p12, vertices);

    return vertices;
}

function signedArea(p0, p1, p2) {
    return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
}

function lineIntersection(p0, p1, p2, p3) {
    let a0 = p1.y - p0.y;
    let b0 = p0.x - p1.x;

    let a1 = p3.y - p2.y;
    let b1 = p2.x - p3.x;

    let det = a0 * b1 - a1 * b0;
    if (det > -EPSILON && det < EPSILON) {
        return null;
    } else {
        let c0 = a0 * p0.x + b0 * p0.y;
        let c1 = a1 * p2.x + b1 * p2.y;

        let x = (b1 * c0 - b0 * c1) / det;
        let y = (a0 * c1 - a1 * c0) / det;
        return { x, y };
    }
}


function createTriangles(p0, p1, p2, lineWidth, vertices) {
    let t0 = subtractPoints(p1, p0);
    let t2 = subtractPoints(p2, p1);

    t0 = perpendicular(t0.x, t0.y);
    t2 = perpendicular(t2.x, t2.y);

    // triangle composed by the 3 points if clockwise or couterclockwise.
    // if counterclockwise, we must invert the line threshold points, otherwise the intersection point
    // could be erroneous and lead to odd results.
    if (signedArea(p0, p1, p2) > 0) {
        t0 = invert(t0.x, t0.y);
        t2 = invert(t2.x, t2.y);
    }

    t0 = normalize(t0.x, t0.y);
    t2 = normalize(t2.x, t2.y);
    t0 = multiplyPoint(t0.x, t0.y, lineWidth);
    t2 = multiplyPoint(t2.x, t2.y, lineWidth);

    const pintersect = lineIntersection(addPoints(t0, p0), addPoints(t0, p1), addPoints(t2, p2), addPoints(t2, p1));

    let anchor = null;
    let anchorLength = Number.MAX_VALUE;
    if (pintersect) {
        anchor = subtractPoints(pintersect, p1);
        anchorLength = toLength(anchor.x, anchor.y);
    }
    const dd = (anchorLength / lineWidth) | 0;
    const p0p1 = subtractPoints(p0, p1);
    const p0p1Length = toLength(p0p1.x, p0p1.y);
    const p1p2 = subtractPoints(p1, p2);
    const p1p2Length = toLength(p1p2.x, p1p2.y);

    /*
     * The cross point exceeds any of the segments dimension.
     * Do not use cross point as reference.
     */
    if (anchorLength > p0p1Length || anchorLength > p1p2Length) {

        vertices.push(addPoints(p0, t0));
        vertices.push(subtractPoints(p0, t0));
        vertices.push(addPoints(p1, t0));

        vertices.push(subtractPoints(p0, t0));
        vertices.push(addPoints(p1, t0));
        vertices.push(subtractPoints(p1, t0));

        createRoundCap(p1, addPoints(p1, t0), addPoints(p1, t2), p2, vertices);

        vertices.push(addPoints(p2, t2));
        vertices.push(subtractPoints(p1, t2));
        vertices.push(addPoints(p1, t2));

        vertices.push(addPoints(p2, t2));
        vertices.push(subtractPoints(p1, t2));
        vertices.push(subtractPoints(p2, t2));

    } else {

        vertices.push(addPoints(p0, t0));
        vertices.push(subtractPoints(p0, t0));
        vertices.push(subtractPoints(p1, anchor));

        vertices.push(addPoints(p0, t0));
        vertices.push(subtractPoints(p1, anchor));
        vertices.push(addPoints(p1, t0));

        const _p0 = addPoints(p1, t0);
        const _p1 = addPoints(p1, t2);
        const _p2 = subtractPoints(p1, anchor);
        const center = p1;

        vertices.push(_p0);
        vertices.push(center);
        vertices.push(_p2);

        createRoundCap(center, _p0, _p1, _p2, vertices);

        vertices.push(center);
        vertices.push(_p1);
        vertices.push(_p2);

        vertices.push(addPoints(p2, t2));
        vertices.push(subtractPoints(p1, anchor));
        vertices.push(addPoints(p1, t2));

        vertices.push(addPoints(p2, t2));
        vertices.push(subtractPoints(p1, anchor));
        vertices.push(subtractPoints(p2, t2));

    }
}
