# Knowledge Graph - Future Enhancements

## Optional: 3D Depth Visualization

### Concept
Add a pseudo-3D depth effect where nodes are visually layered by type:
- **Layer 0 (Front)**: Primary conditions and allergies
- **Layer 1 (Middle)**: Symptoms, test results, family history  
- **Layer 2 (Back)**: Medications, procedures, treatments, providers

### Visual Effects
- Scale: Nodes further back appear slightly smaller
- Opacity: Background nodes are more transparent
- Focus mode: Click to focus on a specific layer, dimming others
- Smooth transitions between states

### Challenges Encountered
1. **Blur doesn't scale with zoom** - CSS blur filter remains constant regardless of zoom level, making distant nodes permanently blurry
2. **Visibility issues** - Even subtle scaling/opacity changes made some nodes hard to see
3. **Complexity vs benefit** - The effect requires careful tuning to be useful without being distracting

### Potential Solutions
1. **Use a 3D library** - Three.js or React-Three-Fiber for true 3D with proper perspective
2. **Different visual metaphor** - Instead of depth, use:
   - Color temperature (warm = front, cool = back)
   - Border thickness/style
   - Glow effects
   - Layered panels that slide in/out
3. **Simpler approach** - Just use z-index and opacity without scale/blur

### Implementation Notes
- Feature was implemented with toggle in top-right panel
- Code removed but can be found in git history
- Collision detection improvements were kept (400px spacing, 200px hub radius)

### Recommendation
If revisiting this feature:
- Start with color-based depth instead of scale/blur
- Consider using a proper 3D library for true depth
- Test extensively at different zoom levels
- Get user feedback early on whether the effect is helpful

---

**Status**: Deferred  
**Priority**: Low (optional enhancement)  
**Effort**: Medium-High (if using 3D library)  
**Created**: 2026-03-11
