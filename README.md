# Fluxus WebGL 3D game engine

A fully featured browser based game engine used for FoAM Kernow projects such as our Butterfly hunting citizen science games, Viruscraft, Penelope tablet weaving livecoding system and the Royal Society Summer exhibition Malaria games.

Combines WebGL and HTML5 canvas to provide 3D and 2D game elements. Uses the Scheme functional programming language throughout, which is compiled to Javascript at load time. Designed to be livecodable, via a in-browser editor and also includes the ability to statically build HTML with assets, in order to provide games and interactive exibits that can be loaded via file:// prototcol without a web server.

# Licence

GNU Affero General Public License

# Documentation

Bit of a work in progress...

## Importing models

Supports OBJ and PLY. 

* (time)
* (every-frame ...)

returns time in seconds

* (build-cube)
* (build-instance)
* (build-locator)
* (build-polygons type size-verts)
* (load-primitive "filename.obj")
* (load-ply-primitive "filename.ply")

* (with-state ...)
* (with-primitive ...)


* (identity)
* (translate (vector 1 2 3))
* (rotate (vector 90 45 0))
* (scale (vector 2 3 1))
* (concat m)
* (maim dir up)

* (get-transform)

* (camera-transform)
* (set-camera-transform)
* (view-transform)
* (project-point)

* (texture t)
* (shader vert frag)
* (colour col)
* (parent id)

* (hint-none)
* (hint-solid)
* (hint-wire)
* (hint-ignore-depth)
* (hint-nozwrite)
* (hint-cullface)
* (hint-cullccw)

* (pdata-map! fn name)
* (pdata-size)
* (pdata-set! name pos value)
* (pdata-ref name pos)
* (pdata-upload)

updates vbo

* (clear)
* (clear-colour col)
* (load-texture "filename.png")

* (draw-cube)
* (draw-sphere)
* (draw-torus)
* (draw-obj filename)




