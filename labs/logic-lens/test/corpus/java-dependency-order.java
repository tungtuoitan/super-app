import java.util.*;

/** Orders build modules so every module comes after its dependencies. */
public final class BuildOrder {
    private final Map<String, List<String>> deps;
    private final Set<String> done = new HashSet<>();
    private final Set<String> inProgress = new HashSet<>();
    private final List<String> order = new ArrayList<>();

    public BuildOrder(Map<String, List<String>> deps) {
        this.deps = deps;
    }

    public List<String> resolve() {
        for (String module : deps.keySet()) {
            visit(module, new ArrayDeque<>());
        }
        return order;
    }

    private void visit(String module, Deque<String> path) {
        if (done.contains(module)) return;
        if (inProgress.contains(module)) {
            path.push(module);
            throw new IllegalStateException("Dependency cycle: " + String.join(" -> ", path));
        }
        inProgress.add(module);
        path.push(module);
        for (String dep : deps.getOrDefault(module, List.of())) {
            if (!deps.containsKey(dep)) {
                throw new IllegalArgumentException(module + " depends on unknown module " + dep);
            }
            visit(dep, path);
        }
        path.pop();
        inProgress.remove(module);
        done.add(module);
        order.add(module);
    }
}
