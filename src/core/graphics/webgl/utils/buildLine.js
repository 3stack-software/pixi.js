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

    const vertices = [];
    const middlePoints = [];

    let i;
    for (i = 0; i < points.length; i += 2)
    {
        if (i === 0 || i === points.length - 2)
        {
            middlePoints.push(points[i], points[i + 1]);
        }
        else
        {
            middlePoints.push(
                (points[i] + points[i + 2]) * 0.5,
                (points[i + 1] + points[i + 3]) * 0.5
            );
        }
    }
    for (i = 1; i < middlePoints.length; i++)
    {
        createTriangles(middlePoints[i - 1], { x: points[i * 2], y: points[i * 2 + 1] }, middlePoints[i], width, vertices);
    }

    for (const vertex of vertices)
    {
        verts.push(vertex.x, vertex.y);
        verts.push(r, g, b, 1);
    }

    // const p00 = verts[0];
    // const p01 = verts[1];
    // const p02 = { x: points[2], y: points[3] };
    // const p10 = verts[verts.length - 1];
    // const p11 = verts[verts.length - 3];
    // const p12 = { x: points[points.length - 4], y: points[points.length - 3] };
    //
    // // Add roundcap to the start and end of the line.
    // createRoundCap({ x: points[0], y: points[1] }, p00, p01, p02, verts);
    // createRoundCap({ x: points[points.length - 2], y: points[points.length - 1] }, p10, p11, p12, verts);

    // indices
    for (let i = 0; i < vertices.length; ++i)
    {
        indices.push(indexStart++);
    }
}

export function perpendicular(x, y)
{
    return { x: -y, y: x };
}

export function invert(x, y)
{
    return { x: -x, y: -y };
}

export function normalize(x, y)
{
    const mod = toLength(x, y);
    if (mod === 0)
    {
        return { x: 0, y: 0 };
    }
    return { x: x / mod, y: y / mod };
}

export function toLength(x, y)
{
    return Math.sqrt((x * x) + (y * y));
}

export function multiplyPoint(x, y, times)
{
    return { x: x * times, y: y * times };
}

export function midPoint(p1x, p1y, p2x, p2y)
{
    const add = addPoints(p1x, p1y, p2x, p2y);
    return multiplyPoint(add.x, add.y, 0.5);
}

export function addPoints(p1, p2)
{
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1, p2)
{
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function pointsObjectsToArray(points)
{
    const pointObjects = [];
    for (const point of points)
    {
        pointObjects.push(point.x);
        pointObjects.push(point.y);
    }
    return pointObjects;
}

const EPSILON = 0.0001;

export function createRoundCap(center, _p0, _p1, nextPointInLine, vertices)
{
    const outerRadiusPoint = subtractPoints(center, _p0);
    const radius = toLength(outerRadiusPoint.x, outerRadiusPoint.y);

    let angle0 = Math.atan2((_p1.y - center.y), (_p1.x - center.x));
    let angle1 = Math.atan2((_p0.y - center.y), (_p0.x - center.x));

    const originalAngle0 = angle0;

    if (angle1 > angle0)
    {
        if (angle1 - angle0 >= Math.PI - EPSILON)
        {
            angle1 = angle1 - (2 * Math.PI);
        }
    }
    else
    {
        if (angle0 - angle1 >= Math.PI - EPSILON)
        {
            angle0 = angle0 - (2 * Math.PI);
        }
    }

    let angleDiff = angle1 - angle0;

    if (Math.abs(angleDiff) >= Math.PI - EPSILON && Math.abs(angleDiff) <= Math.PI + EPSILON)
    {
        let r1 = subtractPoints(center, nextPointInLine);
        if (r1.x === 0)
        {
            if (r1.y > 0)
            {
                angleDiff = -angleDiff;
            }
        }
        else if (r1.x >= -EPSILON)
        {
            angleDiff = -angleDiff;
        }
    }

    const nsegments = Math.min(Math.abs(angleDiff * radius), 10) + 1;
    const angleInc = angleDiff / nsegments;

    for (let i = 0; i < nsegments; i++)
    {
        vertices.push({ x: center.x, y: center.y });
        vertices.push({
            x: center.x + radius * Math.cos(originalAngle0 + angleInc * i),
            y: center.y + radius * Math.sin(originalAngle0 + angleInc * i),
        });
        vertices.push({
            x: center.x + radius * Math.cos(originalAngle0 + angleInc * (i + 1)),
            y: center.y + radius * Math.sin(originalAngle0 + angleInc * (i + 1)),
        });
    }
}

export function createRoundCap2(center, _p0, _p1, nextPointInLine, vertices)
{
    const outerRadiusPoint = subtractPoints(center, _p0);
    const radius = toLength(outerRadiusPoint.x, outerRadiusPoint.y);

    let angle0 = Math.atan2((_p1.y - center.y), (_p1.x - center.x));
    let angle1 = Math.atan2((_p0.y - center.y), (_p0.x - center.x));

    const originalAngle0 = angle0;

    if (angle1 > angle0)
    {
        if (angle1 - angle0 >= Math.PI - EPSILON)
        {
            angle1 = angle1 - (2 * Math.PI);
        }
    }
    else
    {
        if (angle0 - angle1 >= Math.PI - EPSILON)
        {
            angle0 = angle0 - (2 * Math.PI);
        }
    }

    let angleDiff = angle1 - angle0;

    if (Math.abs(angleDiff) >= Math.PI - EPSILON && Math.abs(angleDiff) <= Math.PI + EPSILON)
    {
        let r1 = subtractPoints(center, nextPointInLine);
        if (r1.x === 0)
        {
            if (r1.y > 0)
            {
                angleDiff = -angleDiff;
            }
        }
        else if (r1.x >= -EPSILON)
        {
            angleDiff = -angleDiff;
        }
    }

    const nsegments = Math.min(Math.abs(angleDiff * radius), 10) + 1;
    const angleInc = angleDiff / nsegments;

    for (let i = 0; i < nsegments; i++)
    {
        vertices.push({ x: center.x, y: center.y });
        vertices.push({
            x: center.x + radius * Math.cos(originalAngle0 + angleInc * i),
            y: center.y + radius * Math.sin(originalAngle0 + angleInc * i),
        });
        vertices.push({
            x: center.x + radius * Math.cos(originalAngle0 + angleInc * (i + 1)),
            y: center.y + radius * Math.sin(originalAngle0 + angleInc * (i + 1)),
        });
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
    }
}

function signedArea(p0, p1, p2)
{
    return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
}

function lineIntersection(p0, p1, p2, p3)
{
    let a0 = p1.y - p0.y;
    let b0 = p0.x - p1.x;

    let a1 = p3.y - p2.y;
    let b1 = p2.x - p3.x;

    let det = a0 * b1 - a1 * b0;
    if (det > -EPSILON && det < EPSILON)
    {
        return null;
    }
    else
    {
        let c0 = a0 * p0.x + b0 * p0.y;
        let c1 = a1 * p2.x + b1 * p2.y;

        let x = (b1 * c0 - b0 * c1) / det;
        let y = (a0 * c1 - a1 * c0) / det;
        return { x, y };
    }
}

function createTriangles(p0, p1, p2, lineWidth, vertices)
{
    let t0 = subtractPoints(p1, p0);
    let t2 = subtractPoints(p2, p1);

    t0 = perpendicular(t0.x, t0.y);
    t2 = perpendicular(t2.x, t2.y);

    // triangle composed by the 3 points if clockwise or couterclockwise.
    // if counterclockwise, we must invert the line threshold points, otherwise the intersection point
    // could be erroneous and lead to odd results.
    if (signedArea(p0, p1, p2) > 0)
    {
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
    if (pintersect)
    {
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
    if (anchorLength > p0p1Length || anchorLength > p1p2Length)
    {

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

    }
    else
    {

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
