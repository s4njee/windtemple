# Support matrix: what this family adds

Story 1.6, not probed yet. This will be a delta on Fire Temple's [support matrix](../../firetemple/docs/support-matrix.md), which covers WebGPU itself, the browsers that ship it, `rgba16float` targets, timestamp queries and the HDR canvas, and on Earth Temple's [delta](../../earthtemple/docs/support-matrix.md) (indirect draws from compute, vertex pulling and multisampled `rgba16float`). This page will cover only what Wind Temple leans on beyond those; the list to probe is in [plan.md](../plan.md), story 1.6:

- `maxComputeWorkgroupStorageSize` and `maxComputeInvocationsPerWorkgroup`, for a small cloth solved in one workgroup;
- the cost of a dispatch, and of many small dispatches in one compute pass, for XPBD's substeps;
- `dispatchWorkgroupsIndirect`;
- storage atomics on `u32` as fixed point;
- `float32-filterable`, for air velocity textures;
- `subgroups`;
- timestamp queries inside compute passes.
