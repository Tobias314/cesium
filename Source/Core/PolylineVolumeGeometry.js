/*global define*/
define([
        './defined',
        './DeveloperError',
        './Cartesian3',
        './CornerType',
        './ComponentDatatype',
        './Ellipsoid',
        './Geometry',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
        './PolylinePipeline',
        './PolylineVolumeGeometryLibrary',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './BoundingRectangle',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat',
        './WindingOrder'
    ], function(
        defined,
        DeveloperError,
        Cartesian3,
        CornerType,
        ComponentDatatype,
        Ellipsoid,
        Geometry,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PolylinePipeline,
        PolylineVolumeGeometryLibrary,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        BoundingRectangle,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat,
        WindingOrder) {
    "use strict";
    function computeAttributes(combinedPositions, shape, boundingRectangle, vertexFormat, ellipsoid) {
        var attributes = new GeometryAttributes();
        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : combinedPositions
            });
        }
        var shapeLength = shape.length;
        var vertexCount = combinedPositions.length/3;
        var length = (vertexCount - shapeLength * 2) / (shapeLength * 2);
        var firstEndIndices = PolygonPipeline.triangulate(shape);

        var indicesCount = (length - 1) * (shapeLength) * 6 + firstEndIndices.length * 2;
        var indices = IndexDatatype.createTypedArray(vertexCount, indicesCount);
        var i, j;
        var LL, UL, UR, LR;
        var offset = shapeLength * 2;
        var index = 0;
        for (i = 0; i < length - 1; i++) {
            for (j = 0; j < shapeLength - 1; j++) {
                LL = j * 2 + i * shapeLength * 2;
                LR = LL + offset;
                UL = LL + 1;
                UR = UL + offset;

                indices[index++] = UL;
                indices[index++] = LL;
                indices[index++] = UR;
                indices[index++] = UR;
                indices[index++] = LL;
                indices[index++] = LR;
            }
            LL = shapeLength * 2 - 2 + i * shapeLength * 2;
            UL = LL + 1;
            UR = UL + offset;
            LR = LL + offset;

            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;
        }

        if (vertexFormat.st) {
            var st = new Float32Array(vertexCount*2);
            var lengthSt = 1 / (length - 1);
            var heightSt = 1 / (boundingRectangle.height);
            var heightOffset = boundingRectangle.height / 2;
            var s, t;
            var stindex = 0;
            for (i = 0; i < length; i++) {
                t = i * lengthSt;
                s = heightSt * (shape[0].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
                for (j = 1; j < shapeLength; j++) {
                    s = heightSt * (shape[j].y + heightOffset);
                    st[stindex++] = s;
                    st[stindex++] = t;
                    st[stindex++] = s;
                    st[stindex++] = t;
                }
                s = heightSt * (shape[0].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }
            for (j = 0; j < shapeLength; j++) {
                t = 0;
                s = heightSt * (shape[j].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }
            for (j = 0; j < shapeLength; j++) {
                t = (length - 1) * lengthSt;
                s = heightSt * (shape[j].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : new Float32Array(st)
            });
        }

        var endOffset = vertexCount - shapeLength * 2;
        for (i = 0; i < firstEndIndices.length; i += 3) {
            var v0 = firstEndIndices[i] + endOffset;
            var v1 = firstEndIndices[i + 1] + endOffset;
            var v2 = firstEndIndices[i + 2] + endOffset;

            indices[index++] = v0;
            indices[index++] = v1;
            indices[index++] = v2;
            indices[index++] = v2 + shapeLength;
            indices[index++] = v1 + shapeLength;
            indices[index++] = v0 + shapeLength;
        }

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            boundingSphere : BoundingSphere.fromVertices(combinedPositions),
            primitiveType : PrimitiveType.TRIANGLES
        });

        if (vertexFormat.normal) {
            geometry = GeometryPipeline.computeNormal(geometry);
        }

        if (vertexFormat.tangent || vertexFormat.binormal) {
            geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
        }

        return geometry;
    }

    /**
     * A description of a polyline with a volume (a 2D shape extruded along a polyline).
     *
     * @alias PolylineVolumeGeometry
     * @constructor
     *
     * @param {Array} options.polylinePositions An array of {Cartesain3} positions that define the center of the polyline volume.
     * @param {Number} options.shapePositions An array of {Cartesian2} positions that define the shape to be extruded along the polyline
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Boolean} [options.cornerType = CornerType.ROUNDED] Determines the style of the corners.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     *
     * @see PolylineVolumeGeometry#createGeometry
     *
     * @example
     * function computeCirclePositions(radius) {
     *     var positions = [];
     *     var theta = CesiumMath.toRadians(1);
     *     var posCount = Math.PI*2/theta;
     *     for (var i = 0; i < posCount; i++) {
     *         positions.push(new Cartesian2(radius * Math.cos(theta * i), radius * Math.sin(theta * i)));
     *     }
     *     return positions;
     * }
     *
     * var tube = new PolylineVolumeGeometry({
     *     vertexFormat : VertexFormat.POSITION_ONLY,
     *     polylinePositions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *     shapePositions : circlePositions(10000)
     * });
     */
    var PolylineVolumeGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.polylinePositions;
        if (!defined(positions)) {
            throw new DeveloperError('options.polylinePositions is required.');
        }
        var shape = options.shapePositions;
        if (!defined(shape)) {
            throw new DeveloperError('options.shapePositions is required.');
        }

        this._positions = positions;
        this._shape = shape;
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._height = defaultValue(options.height, 0);
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createPolylineVolumeGeometry';
    };

    /**
     * Computes the geometric representation of a polyline with a volume, including its vertices, indices, and a bounding sphere.
     * @memberof PolylineVolumeGeometry
     *
     * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polyline volume.
     *
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Count of unique polyline positions must be greater than 1.
     * @exception {DeveloperError} Count of unique shape positions must be at least 3.
     */
    var brScratch = new BoundingRectangle();
    PolylineVolumeGeometry.createGeometry = function(polylineVolumeGeometry) {
        var positions = polylineVolumeGeometry._positions;
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('Count of unique polyline positions must be greater than 1.');
        }
        var shape2D = polylineVolumeGeometry._shape;
        shape2D = PolylineVolumeGeometryLibrary.removeDuplicates(shape2D);
        if (shape2D.length < 3) {
            throw new DeveloperError('Count of unique shape positions must be at least 3.');
        }
        if (PolygonPipeline.computeWindingOrder2D(shape2D).value === WindingOrder.CLOCKWISE.value) {
            shape2D.reverse();
        }
        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);

        var computedPositions = PolylineVolumeGeometryLibrary.computePositions(cleanPositions, shape2D, boundingRectangle, polylineVolumeGeometry, true);
        return computeAttributes(computedPositions, shape2D, boundingRectangle, polylineVolumeGeometry._vertexFormat, polylineVolumeGeometry._ellipsoid);
    };

    return PolylineVolumeGeometry;
});