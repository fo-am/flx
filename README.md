# fluxus webgl 3D game engine

used in

(time)
(every-frame ...)

returns time in seconds

(build-cube)
(build-instance)
(build-locator)
(build-polygons type size-verts)
(load-primitive "filename.obj")
(load-ply-primitive "filename.ply")

(with-state ...)
(with-primitive ...)


(identity)
(translate (vector 1 2 3))
(rotate (vector 90 45 0))
(scale (vector 2 3 1))
(concat m)
(maim dir up)

(get-transform)

(camera-transform)
(set-camera-transform)
(view-transform)
(project-point)

(texture t)
(shader vert frag)
(colour col)
(parent id)

(hint-none)
(hint-solid)
(hint-wire)
(hint-ignore-depth)
(hint-nozwrite)
(hint-cullface)
(hint-cullccw)

(pdata-map! fn name)
(pdata-size)
(pdata-set! name pos value)
(pdata-ref name pos)
(pdata-upload)
updates vbo

(clear)
(clear-colour col)
(load-texture "filename.png")

(draw-cube)
(draw-sphere)
(draw-torus)
(draw-obj filename)




