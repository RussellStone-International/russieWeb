import React, {useMemo, useState} from "react";
import getCommands from "../commands.js"
import {Terminal, ChevronRight} from "lucide-react"

const commands = getCommands();

const CommandsSidebar = React.memo(function CommandsSidebar({
                                                                commandsPanelOpen,
                                                                handleCommandClick,
                                                            }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = useMemo(() => {
        return ["All", ...new Set(commands.map(c => c.category))];
    }, []);

    const filteredCommands = React.useMemo(() => {
        return commands.filter(cmd => {
            const matchesSearch = cmd.cmd.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cmd.desc.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || cmd.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    if (!commandsPanelOpen) return null;

    return (
        <aside className="commands-sidebar">
            <div className="commands-bg">
            <div className="commands-header-container">
            <div className="commands-header">
                <h3 className="commands-title">
                    <Terminal className="commands-title-icon" />
                    Quick Commands
                </h3>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search commands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="command-search-input"
                />
                <p className="commands-subtitle">
                    Click any command to execute quickly
                </p>

                {/* Categories */}
                <div className="category-filters">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`category-btn ${selectedCategory === cat ? 'category-btn-active' : ''}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            </div>

            {/* Commands List */}
            <div className="commands-list-container">
                <div className="commands-list">
                    {filteredCommands.map(({ cmd, desc }) => (
                        <button
                            key={cmd}
                            onClick={() => handleCommandClick(cmd)}
                            className="command-btn"
                        >
                            <ChevronRight className="command-icon" />
                            <div className="command-content">
                                <div className="command-name">/{cmd}</div>
                                <div className="command-desc">{desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            </div>
        </aside>
    );
}, (prevProps, nextProps) => {
    // Only re-render if commandsPanelOpen changes
    return prevProps.commandsPanelOpen === nextProps.commandsPanelOpen;
});

export default CommandsSidebar;