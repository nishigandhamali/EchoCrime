# 3D asset credits

All third-party assets are **CC0 1.0** (public domain). Credit is appreciated but not required.

| Files | Source |
|---|---|
| `gallery/*.glb`, `rooms/*.glb` (busts, horse statue, vase, picture frames, mirror, console, ottoman, plant, office desk, chair, laptop, security camera, shelves, crates, hand truck, fire extinguisher) | Poly Haven, https://polyhaven.com (models by Rico Cilliers and others). Textures resized to 512 px webp and meshes decimated. |
| `../textures/*.webp` (marble_01, dark_wood, painted_plaster_wall: diffuse, normal, roughness) | Poly Haven, 1k originals converted to webp. |
| `characters/detective.glb` | Quaternius, Universal Base Characters [Standard] and Universal Animation Library [Standard], https://quaternius.itch.io. The body's base-colour map was repainted offline (trench coat, trousers, shoes) using the mesh's bone weights; hair is Quaternius `Hair_SimpleParted`; animations are `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Interact`. |
| `../art/*.webp` | The Metropolitan Museum of Art Open Access (public domain): Vermeer, Bruegel the Elder, Turner, van Gogh. Metadata in `../art/paintings.json`. |

Everything else (walls, floors, columns, display case, banners, ropes, window, glass shards, vehicle, security racks) is built procedurally in `src/scene/`.
