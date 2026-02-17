import { h, useState, useEffect, useRef } from '../../lib/preact.js';

interface TreeNode {
    id: string | number;
    text: string;
    children?: boolean | TreeNode[];
}

function normalizeId(id: string | number): string {
    return String(id).replace(/r$/, '');
}

function parseNodeText(text: string) {
    const hasRecursive = text.includes('<i/>');
    const label = text.replace('<i/>', '').trim();
    return { hasRecursive, label };
}

interface TreeNodeProps {
    node: TreeNode;
    level: number;
    onSelect: (id: string | number, recursive: boolean) => void;
    onToggle: (id: string | number) => void;
    isExpanded: boolean;
    isLoading: boolean;
    childrenLoaded: boolean | TreeNode[] | undefined;
    isMatch: boolean;
}

function TreeNode({ node, level = 0, onSelect, onToggle, isExpanded, isLoading, childrenLoaded, isMatch }: TreeNodeProps) {
    const { hasRecursive, label } = parseNodeText(node.text);
    const paddingLeft = 12 + (level * 20);
    const hasChildren = childrenLoaded === true || (Array.isArray(childrenLoaded) && childrenLoaded.length > 0);

    return (
        <div className={`entity-tree-node ${isMatch ? 'search-match' : ''}`} style={{ paddingLeft: `${paddingLeft}px` }}>
            <div className="entity-node-content d-flex align-items-center">
                {hasChildren && (
                    <button
                        className="btn btn-sm btn-link text-muted px-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(node.id);
                        }}
                        aria-expanded={isExpanded ? 'true' : 'false'}
                    >
                        <i className={`fa ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                    </button>
                )}
                <span
                    className={`entity-label flex-grow-1 cursor-pointer ${isLoading ? 'text-muted' : ''} ${isMatch ? 'fw-bold text-primary' : ''}`}
                    onClick={() => onSelect(node.id, false)}
                >
                    {label}
                </span>
                {hasRecursive && (
                    <button
                        className="btn btn-sm btn-link text-secondary px-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(node.id, true);
                        }}
                        title={__('Select with children', 'dashboardng')}
                    >
                        <i className="fa fa-angle-double-down"></i>
                    </button>
                )}
            </div>
            {isExpanded && childrenLoaded === true && (
                <div className="text-muted small" style={{ paddingLeft: `${paddingLeft + 20}px` }}>
                    <i className="fa fa-spinner fa-spin me-1"></i>
                </div>
            )}
        </div>
    );
}

interface EntitySelectorProps {
    rootDoc: string;
    onOpen?: () => void;
}

export function EntitySelector({ rootDoc }: EntitySelectorProps) {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(new Set());
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
    const [nodeChildrenMap, setNodeChildrenMap] = useState<Map<string, boolean | TreeNode[]>>(new Map());
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | undefined>(undefined);
    const [matchedNodeIds, setMatchedNodeIds] = useState<Set<string | number>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);
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
            .then((data: TreeNode[]) => {
                setNodes(data || []);
                data.forEach(node => {
                    if (node.children === true || (Array.isArray(node.children) && node.children.length > 0)) {
                        setNodeChildrenMap(prev => new Map(prev).set(normalizeId(node.id), node.children!));
                    }
                });
            })
            .catch(error => console.error('Failed to load root entities:', error));
    };

    const loadChildren = (nodeId: string, options: { force?: boolean } = {}) => {
        const { force = false } = options;
        const normalizedId = normalizeId(nodeId);

        if (loadingNodes.has(normalizedId)) {return Promise.resolve();}

        const childrenStatus = nodeChildrenMap.get(normalizedId);
        if (!force && childrenStatus !== true && !Array.isArray(childrenStatus)) {return Promise.resolve();}

        setLoadingNodes(prev => new Set(prev).add(normalizedId));

        return fetch(`${rootDoc}/ajax/entitytreesons.php?node=${normalizedId}`)
            .then(r => r.json())
            .then((data: TreeNode[]) => {
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

                return data;
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

    const toggleNode = (nodeId: string | number) => {
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

    const handleSelect = (entityId: string | number, isRecursive: boolean) => {
        let url = `${rootDoc}/front/central.php?active_entity=${entityId}`;
        if (isRecursive) {
            url += '&is_recursive=1';
        }
        window.location.href = url;
    };

    const performSearch = async (searchStr: string) => {
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

            const ancestorIds: (string | number)[] = await response.json();
            const searchLower = searchStr.toLowerCase();

            setExpandedNodes(new Set());
            setMatchedNodeIds(new Set());

            for (let i = 0; i < ancestorIds.length; i++) {
                const id = ancestorIds[i];
                const normalizedId = normalizeId(id);

                const children = await loadChildren(normalizedId, { force: true }) as TreeNode[];
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
            setSearchError((error as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchSubmit = (e: Event) => {
        e.preventDefault();
        if (searchText.length >= 3) {
            performSearch(searchText);
        }
    };

    const handleSearchChange = (e: Event) => {
        setSearchText((e.target as HTMLInputElement).value);
    };

    const renderNode = (node: TreeNode, level: number) => {
        const normalizedId = normalizeId(node.id);
        const isExpanded = expandedNodes.has(node.id);
        const isLoading = loadingNodes.has(normalizedId);
        const childrenLoaded = nodeChildrenMap.get(normalizedId);
        const isMatch = matchedNodeIds.has(node.id);

        return (
            <div key={node.id}>
                <TreeNode
                    node={node}
                    level={level}
                    onSelect={handleSelect}
                    onToggle={toggleNode}
                    isExpanded={isExpanded}
                    isLoading={isLoading}
                    childrenLoaded={childrenLoaded}
                    isMatch={isMatch}
                />
                {isExpanded && Array.isArray(childrenLoaded) && childrenLoaded.map(child => renderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="entity-tree">
            <form aria-label="Entity Search" className="mb-3" onSubmit={handleSearchSubmit}>
                <div className="input-group">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="form-control"
                        placeholder={__('Search')}
                        value={searchText}
                        onInput={handleSearchChange}
                    />
                    <button type="submit" className="btn btn-outline-secondary" disabled={searching || searchText.length < 3}>
                        {searching && <i className="fa fa-spinner fa-spin me-1"></i>}{__('Search')}
                    </button>
                </div>
            </form>
            {searchError && (
                <div className="alert alert-danger" role="alert">
                    {searchError}
                </div>
            )}
            {nodes.length === 0 && (
                <div className="text-center text-muted py-4">
                    <i className="fa fa-spinner fa-spin fa-2x"></i>
                </div>
            )}
            {nodes.map(node => renderNode(node, 0))}
        </div>
    );
}
