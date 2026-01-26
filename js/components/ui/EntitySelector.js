import { html, useState, useEffect, useRef } from '../../lib/preact.js';

function normalizeId(id) {
    return String(id).replace(/r$/, '');
}

function parseNodeText(text) {
    const hasRecursive = text.includes('<i/>');
    const label = text.replace('<i/>', '').trim();
    return { hasRecursive, label };
}

function TreeNode({ node, level = 0, onSelect, onToggle, isExpanded, isLoading, childrenLoaded, isMatch }) {
    const { hasRecursive, label } = parseNodeText(node.text);
    const paddingLeft = 12 + (level * 20);
    const hasChildren = childrenLoaded === true || (Array.isArray(childrenLoaded) && childrenLoaded.length > 0);

    return html`
        <div class="entity-tree-node ${isMatch ? 'search-match' : ''}" style="padding-left: ${paddingLeft}px;">
            <div class="entity-node-content d-flex align-items-center">
                ${hasChildren && html`
                    <button
                        class="btn btn-sm btn-link text-muted px-1"
                        onClick=${(e) => {
                            e.stopPropagation();
                            onToggle(node.id);
                        }}
                        aria-expanded=${isExpanded ? 'true' : 'false'}
                    >
                        <i class="fa ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}"></i>
                    </button>
                `}
                <span
                    class="entity-label flex-grow-1 cursor-pointer ${isLoading ? 'text-muted' : ''} ${isMatch ? 'fw-bold text-primary' : ''}"
                    onClick=${() => onSelect(node.id, false)}
                >
                    ${label}
                </span>
                ${hasRecursive && html`
                    <button
                        class="btn btn-sm btn-link text-secondary px-1"
                        onClick=${(e) => {
                            e.stopPropagation();
                            onSelect(node.id, true);
                        }}
                        title="${__('Select with children', 'dashboardng')}"
                    >
                        <i class="fa fa-angle-double-down"></i>
                    </button>
                `}
            </div>
            ${isExpanded && childrenLoaded === true && html`
                <div class="text-muted small" style="padding-left: ${paddingLeft + 20}px;">
                    <i class="fa fa-spinner fa-spin me-1"></i>
                </div>
            `}
        </div>
    `;
}

export function EntitySelector({ rootDoc, onOpen }) {
    const [nodes, setNodes] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [loadingNodes, setLoadingNodes] = useState(new Set());
    const [nodeChildrenMap, setNodeChildrenMap] = useState(new Map());
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(undefined);
    const [matchedNodeIds, setMatchedNodeIds] = useState(new Set());
    const searchInputRef = useRef(null);
    const [currentSearchText, setCurrentSearchText] = useState('');

    useEffect(() => {
        loadRoot();
    }, [rootDoc]);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchText.length >= 3) {
                performSearch(searchText);
            } else if (searchText.length === 0) {
                setMatchedNodeIds(new Set());
                setCurrentSearchText('');
                setSearchError(undefined);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchText]);

    const loadRoot = () => {
        fetch(`${rootDoc}/ajax/entitytreesons.php?node=-1`)
            .then(r => r.json())
            .then(data => {
                setNodes(data || []);
                data.forEach(node => {
                    if (node.children === true || (Array.isArray(node.children) && node.children.length > 0)) {
                        setNodeChildrenMap(prev => new Map(prev).set(normalizeId(node.id), node.children));
                    }
                });
            })
            .catch(error => console.error('Failed to load root entities:', error));
    };

    const loadChildren = (nodeId, options = {}) => {
        const { force = false } = options;
        const normalizedId = normalizeId(nodeId);

        if (loadingNodes.has(normalizedId)) {return Promise.resolve();}

        const childrenStatus = nodeChildrenMap.get(normalizedId);
        if (!force && childrenStatus !== true && !Array.isArray(childrenStatus)) {return Promise.resolve();}

        setLoadingNodes(prev => new Set(prev).add(normalizedId));

        return fetch(`${rootDoc}/ajax/entitytreesons.php?node=${normalizedId}`)
            .then(r => r.json())
            .then(data => {
                setNodeChildrenMap(prev => {
                    const updated = new Map(prev);
                    updated.set(normalizedId, data);
                    data.forEach(child => {
                        if (child.children === true) {
                            updated.set(normalizeId(child.id), true);
                        }
                    });
                    return updated;
                });

                if (currentSearchText && currentSearchText.length >= 3) {
                    const searchLower = currentSearchText.toLowerCase();
                    setMatchedNodeIds(prev => {
                        const matches = new Set(prev);
                        data.forEach(child => {
                            const { label } = parseNodeText(child.text);
                            if (label.toLowerCase().includes(searchLower)) {
                                matches.add(child.id);
                            }
                        });
                        return matches;
                    });
                }

                setLoadingNodes(prev => {
                    const updated = new Set(prev);
                    updated.delete(normalizedId);
                    return updated;
                });
            })
            .catch(error => {
                console.error('Failed to load children:', error);
                setLoadingNodes(prev => {
                    const updated = new Set(prev);
                    updated.delete(normalizedId);
                    return updated;
                });
                throw error;
            });
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => {
            const updated = new Set(prev);
            if (updated.has(nodeId)) {
                updated.delete(nodeId);
            } else {
                updated.add(nodeId);
                loadChildren(normalizeId(nodeId));
            }
            return updated;
        });
    };

    const handleSelect = (entityId, isRecursive) => {
        let url = `${rootDoc}/front/central.php?active_entity=${entityId}`;
        if (isRecursive) {
            url += '&is_recursive=1';
        }
        window.location.href = url;
    };

    const performSearch = async (searchStr) => {
        setSearching(true);
        setSearchError(undefined);
        setCurrentSearchText(searchStr);

        try {
            const response = await fetch(`${rootDoc}/ajax/entitytreesearch.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `str=${encodeURIComponent(searchStr)}`
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const ancestorIds = await response.json();
            const searchLower = searchStr.toLowerCase();

            setExpandedNodes(new Set());
            setMatchedNodeIds(new Set());

            for (let i = 0; i < ancestorIds.length; i++) {
                const id = ancestorIds[i];
                const normalizedId = normalizeId(id);

                const children = await loadChildren(normalizedId, { force: true });
                setExpandedNodes(prev => new Set(prev).add(id));

                if (i === ancestorIds.length - 1 && Array.isArray(children)) {
                    const matchingChildren = children.filter(child => {
                        const { label } = parseNodeText(child.text);
                        return label.toLowerCase().includes(searchLower);
                    });

                    setMatchedNodeIds(prev => {
                        const matches = new Set(prev);
                        ancestorIds.forEach(ancId => matches.add(normalizeId(ancId)));
                        matchingChildren.forEach(child => matches.add(String(child.id)));
                        return matches;
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(error.message);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchText.length >= 3) {
            performSearch(searchText);
        }
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
    };

    const renderNode = (node, level) => {
        const normalizedId = normalizeId(node.id);
        const isExpanded = expandedNodes.has(node.id);
        const isLoading = loadingNodes.has(normalizedId);
        const childrenLoaded = nodeChildrenMap.get(normalizedId);
        const isMatch = matchedNodeIds.has(node.id);

        return html`
            <${TreeNode}
                key=${node.id}
                node=${node}
                level=${level}
                onSelect=${handleSelect}
                onToggle=${toggleNode}
                isExpanded=${isExpanded}
                isLoading=${isLoading}
                childrenLoaded=${childrenLoaded}
                isMatch=${isMatch}
            />
            ${isExpanded && Array.isArray(childrenLoaded) && childrenLoaded.map(child => renderNode(child, level + 1))}
        `;
    };

    return html`
        <div class="entity-tree">
            <form aria-label="Entity Search" class="mb-3" onSubmit=${handleSearchSubmit}>
                <div class="input-group">
                    <input
                        ref=${searchInputRef}
                        type="text"
                        class="form-control"
                        placeholder="${__('Search')}"
                        value=${searchText}
                        onInput=${handleSearchChange}
                    />
                    <button type="submit" class="btn btn-outline-secondary" disabled=${searching || searchText.length < 3}>
                        ${searching ? html`<i class="fa fa-spinner fa-spin me-1"></i>` : ''}${__('Search')}
                    </button>
                </div>
            </form>
            ${searchError && html`
                <div class="alert alert-danger" role="alert">
                    ${searchError}
                </div>
            `}
            ${nodes.length === 0 && html`
                <div class="text-center text-muted py-4">
                    <i class="fa fa-spinner fa-spin fa-2x"></i>
                </div>
            `}
            ${nodes.map(node => renderNode(node, 0))}
        </div>
    `;
}
