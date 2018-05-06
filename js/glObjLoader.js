function force_load_obj(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, false );
    xmlHttp.overrideMimeType("script");
    xmlHttp.send( null );
    var str=xmlHttp.responseText;
    return inner_load_obj(xmlHttp.responseText);
}

function inner_load_obj(string) {
    var lines = string.split("\n");
    var positions = [];
    var normals = [];
    var tex = [];
    var verts = [];
    var have_tex = false;

    for ( var i = 0 ; i < lines.length ; i++ ) {
        var parts = lines[i].trimRight().split(' ');
        if ( parts.length > 0 ) {
            switch(parts[0]) {
            case 'v':  positions.push(
		vec3.create(
                    [parseFloat(parts[1]),
                     parseFloat(parts[2]),
                     parseFloat(parts[3])]
		));
		break;
            case 'vn':
		normals.push(
                    vec3.create(
			[parseFloat(parts[1]),
			 parseFloat(parts[2]),
			 parseFloat(parts[3])]));
		break;
            case 'vt':
		have_tex = true;
		tex.push(
                    vec3.create(
			[parseFloat(parts[1]),
			 parseFloat(parts[2]),
			 0]));
		break;
            case 'f': {
		var f1 = parts[1].split('/');
		var f2 = parts[2].split('/');
		var f3 = parts[3].split('/');

		Array.prototype.push.apply(
                    verts, positions[parseInt(f1[0]) - 1]);
		Array.prototype.push.apply(
                    verts, normals[parseInt(f1[2]) - 1]);
		if (!have_tex) {
		    Array.prototype.push.apply(
			verts, positions[parseInt(f1[0]) - 1]);
		} else {
		    Array.prototype.push.apply(
			verts, tex[parseInt(f1[1]) - 1]);
		}
		// colours
		Array.prototype.push.apply(
		    verts, [1,1,1]);

		Array.prototype.push.apply(
                    verts, positions[parseInt(f2[0]) - 1]);
		Array.prototype.push.apply(
                    verts, normals[parseInt(f2[2]) - 1]);
		if (!have_tex) {
		    Array.prototype.push.apply(
			verts, positions[parseInt(f2[0]) - 1]);
		} else {
		    Array.prototype.push.apply(
			verts, tex[parseInt(f2[1]) - 1]);
		}
		// colours
		Array.prototype.push.apply(
		    verts,[1,1,1]);

		Array.prototype.push.apply(
                    verts, positions[parseInt(f3[0]) - 1]);
		Array.prototype.push.apply(
                    verts, normals[parseInt(f3[2]) - 1]);
		if (!have_tex) {
		    Array.prototype.push.apply(
			verts, positions[parseInt(f3[0]) - 1]);
		} else {
		    Array.prototype.push.apply(
			verts, tex[parseInt(f3[1]) - 1]);
		}
		// colours
		Array.prototype.push.apply(
		    verts, [1,1,1]);
            }
            }
        }
    }
    // returns fluxus vbo object (see vbo.jscm)
    return [["p","n","t","c"],
	    (verts.length/3)/4, verts, 0];
}

