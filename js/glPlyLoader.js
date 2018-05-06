function force_load_ply(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    xmlHttp.overrideMimeType("script");
    xmlHttp.send( null );
    var str=xmlHttp.responseText;
    return inner_load_ply(xmlHttp.responseText);
}

// PLY object
function PLY() { this.object; }

// PLY file vertex entry format
function PLY_Vertex(x, y, z, nx, ny, nz, u, v, r, g, b) {
    this.x = 0; // a_Position
    this.y = 0;
    this.z = 0;
    this.nx= 0; // a_Normal
    this.ny= 0;
    this.nz= 0;
    this.u = 0; // a_Texture
    this.v = 0;
    this.r = 0; // a_Color
    this.g = 0;
    this.b = 0;
}

// PLY file face consisting of 3 vertex indices for each face
function PLY_Face(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
}


function inner_load_ply(data) {
    var lines = data.split("\n");
    var PLY_index = 0;
    var arrayVertex, arrayNormal, arrayTexture, arrayColor, arrayIndex;
    var vertices = null;
    var faces = null;
    // Number of vertices in PLY file
    var PLY_Vertices = 0;
    // Number of faces in PLY file
    var PLY_Faces = 0;
    // For skipping header
    var ReadingPLYData = false;
    // 11 entries per vertex (x,y,z,nx,ny,nz,r,g,b,u,v)
    var PLY_DataLenght = 11;
    var VAO_VertexIndex = 0;
    var FaceIndex = 0;

    //console.log("PLY number of lines = " + lines.length);

    for (var i = 0; i < lines.length; i++)
    {
        if (ReadingPLYData)
        {
            var e = lines[i].split(" ");

            // Read vertices
            if (PLY_index < PLY_Vertices) {

                vertices[PLY_index] = new PLY_Vertex();
                vertices[PLY_index].x = e[0];
                vertices[PLY_index].y = e[1];
                vertices[PLY_index].z = e[2];
                vertices[PLY_index].nx = e[3];
                vertices[PLY_index].ny = e[4];
                vertices[PLY_index].nz = e[5];
                vertices[PLY_index].u = e[6];
                vertices[PLY_index].v = e[7];
                vertices[PLY_index].r = e[8];
                vertices[PLY_index].g = e[9];
                vertices[PLY_index].b = e[10];

                // Read faces
            } else {

                // Reset index for building VAOs
		if (PLY_index == PLY_Vertices) {

                    //console.log("Resetting Index...");

                    FaceIndex = 0;

                    VAO_VertexIndex = 0;
                }

                // Wire face data to appropriate vertices
                var n = e[0]; // unused, always 3; assumes triangulated models only
                var a = e[1]; // face vertex A
                var b = e[2]; // face vertex B
                var c = e[3]; // face vertex C

                if (FaceIndex < PLY_Faces)
                {
                    // We don't really have to *store* face data
                    // faces[FaceIndex] = new PLY_Face(a, b, c);

                    // vertices
                    arrayVertex.push(vertices[a].x);
                    arrayVertex.push(vertices[a].y);
                    arrayVertex.push(vertices[a].z);
                    arrayVertex.push(vertices[b].x);
                    arrayVertex.push(vertices[b].y);
                    arrayVertex.push(vertices[b].z);
                    arrayVertex.push(vertices[c].x);
                    arrayVertex.push(vertices[c].y);
                    arrayVertex.push(vertices[c].z);

                    // normals
                    arrayNormal.push(vertices[a].nx);
                    arrayNormal.push(vertices[a].ny);
                    arrayNormal.push(vertices[a].nz);
                    arrayNormal.push(vertices[b].nx);
                    arrayNormal.push(vertices[b].ny);
                    arrayNormal.push(vertices[b].nz);
                    arrayNormal.push(vertices[c].nx);
                    arrayNormal.push(vertices[c].ny);
                    arrayNormal.push(vertices[c].nz);

                    // colors
                    arrayColor.push(vertices[a].r);
                    arrayColor.push(vertices[a].g);
                    arrayColor.push(vertices[a].b);
                    arrayColor.push(vertices[b].r);
                    arrayColor.push(vertices[b].g);
                    arrayColor.push(vertices[b].b);
                    arrayColor.push(vertices[c].r);
                    arrayColor.push(vertices[c].g);
                    arrayColor.push(vertices[c].b);

                    // uv
                    arrayTexture.push(vertices[a].u);
                    arrayTexture.push(vertices[a].v);
                    arrayTexture.push(vertices[b].u);
                    arrayTexture.push(vertices[b].v);
                    arrayTexture.push(vertices[c].u);
                    arrayTexture.push(vertices[c].v);

                    // index
                    arrayIndex.push(FaceIndex);
                }

                FaceIndex++;
            }

            PLY_index++;

        } else { // Still reading header...

            // Read number of vertices stored in the file
            if (lines[i].substr(0, "element vertex".length) == "element vertex")
                PLY_Vertices = lines[i].split(" ")[2];

            // Read number of faces stored in the file
            if (lines[i].substr(0, "element face".length) == "element face")
                PLY_Faces = lines[i].split(" ")[2];
        }

        // Finished reading header data, prepare for reading vertex data
        if (lines[i] == "end_header") {

            // Allocate enough space for vertices
            vertices = new Array(PLY_Vertices);

            // Allocate enough space for faces
            faces = new Array(PLY_Faces);

            // Allocate memory for returned arrays (VAOs)
            arrayVertex  = new Array(); // PLY_Vertices * 3
            arrayNormal  = new Array(); // PLY_Vertices * 3
            arrayTexture = new Array(); // PLY_Vertices * 2
            arrayColor   = new Array(); // PLY_Vertices * 3
            arrayIndex   = new Array(); // PLY_Vertices * 1

            ReadingPLYData = true;
        }
    }

//    console.log("PLY_Vertices = " + PLY_Vertices + " loaded");
//    console.log("PLY_Faces = " + PLY_Faces + " loaded");
//    console.log("arrayVertex length = " + arrayVertex.length);
//    console.log("arrayNormal length = " + arrayNormal.length);
//    console.log("arrayTexture length = " + arrayTexture.length);
//    console.log("arrayColor length = " + arrayColor.length);
//    console.log("arrayIndex length = " + arrayIndex.length);

    // We now have both complete vertex and face data loaded;
    // return everything we loaded as Float32Array & Uint16Array for index
    
    var len = arrayVertex.length/3*12;
    var verts = new Float32Array(len);
    var pos = 0;
    var tpos = 0;
    var vp = 0;
    for (var i=0; i<arrayVertex.length/3; i++) {
	verts[vp++]=arrayVertex[pos];
	verts[vp++]=arrayVertex[pos+1];
	verts[vp++]=arrayVertex[pos+2];
	
	verts[vp++]=arrayNormal[pos];
	verts[vp++]=arrayNormal[pos+1];
	verts[vp++]=arrayNormal[pos+2];

	verts[vp++]=arrayTexture[tpos];
	verts[vp++]=arrayTexture[tpos+1];
	verts[vp++]=0;

	verts[vp++]=arrayColor[pos]/255.0;
	verts[vp++]=arrayColor[pos+1]/255.0;
	verts[vp++]=arrayColor[pos+2]/255.0;

	pos+=3;
	tpos+=2;
    }

    return [["p","n","t","c"],
	    arrayIndex.length*3, verts, 0];
    // return [
    //     new Float32Array(arrayVertex),
    //     new Float32Array(arrayNormal),
    //     new Float32Array(arrayTexture),
    //     new Float32Array(arrayColor),
    //     new Uint16Array(arrayIndex)
    // ];
}

