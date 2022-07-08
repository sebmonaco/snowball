/* eslint-disable object-curly-newline */
import { createStore } from 'vuex';
import { filter } from '@/utils/search';
import { processTags, updateAutoTags } from '@/utils/tags';

import filePersistence from '@/store/persistence';
import historyTracking from '@/store/history';

export default createStore({
    state: {
        projectPath: '',
        sheets: {
            core: {
                id: 'core',
                name: 'Core',
                papers: [],
            },
        },
        papers: {},
        tags: {},

        user: {
            name: null,
            email: null,
            salt: null,
        },

        loading: false,

        filter: '',
        filterTags: false,
        filterMethod: 'Boolean',
        filterChanged: false,
        filterResult: [],

        activeSheet: 'core',
        activePaper: null,
        selection: [],
    },
    getters: {
        currentSheet(state) {
            return state.sheets[state.activeSheet];
        },

        currentPapers(state) {
            const currentSheet = state.sheets[state.activeSheet];
            const currentPapers = currentSheet.papers.map((id) => state.papers[id]);

            if (state.filter.length === 0) return currentPapers;
            if (!state.filterChanged) return state.filterResult;
            state.filterResult = filter(
                state.filterMethod,
                currentPapers,
                state.filter,
                state.filterTags ? ['tags'] : ['title', 'abstract', 'keywords', 'tags'],
                {
                    tags: (tags, paper) =>
                        // eslint-disable-next-line implicit-arrow-linebreak
                        processTags(state, paper)
                            .map((tag) => tag.text)
                            .join(' '),
                },
            );
            const newKeys = [];
            state.filterResult.forEach((paper) => {
                if (state.selection.includes(paper.id)) {
                    newKeys.push(paper.id);
                }
            });
            state.selection = newKeys;
            state.filterChanged = false;
            return state.filterResult;
        },

        decided(state) {
            return Object.keys(state.papers).filter((paperId) => {
                const paper = state.papers[paperId];
                return paper.decision !== 'undecided';
            }).map((paperId) => state.papers[paperId]);
        },

        included(state) {
            return Object.keys(state.papers).filter((paperId) => {
                const paper = state.papers[paperId];
                return paper.decision === 'include';
            }).map((paperId) => state.papers[paperId]);
        },

        excluded(state) {
            return Object.keys(state.papers).filter((paperId) => {
                const paper = state.papers[paperId];
                return paper.decision === 'exclude';
            }).map((paperId) => state.papers[paperId]);
        },

        tagUsageCount: (state) => (tagId) => Object.keys(state.papers).filter((paperId) => {
            const paper = state.papers[paperId];
            return paper.tags.includes(tagId);
        }).length,

        activeIncludedPapers(state) {
            const currentSheet = state.sheets[state.activeSheet];
            const currentPapers = currentSheet.papers.map((id) => state.papers[id]);
            return currentPapers.filter((paper) => paper.decision === 'include');
        },
    },
    mutations: {
        setUser(state, user) {
            state.user = user;
        },

        setVersion(state, value) {
            state.version = value;
        },

        setSelection(state, value) {
            state.selection = value;
        },

        setFilter(state, payload) {
            state.filter = payload.filter;
            state.filterTags = payload.tagsOnly;
            state.filterMethod = payload.method;
            state.filterChanged = true;
        },

        setActiveSheet(state, value) {
            state.activeSheet = value;
        },

        setActivePaper(state, paperId) {
            state.activePaper = paperId ? state.papers[paperId] : null;
        },

        setLoading(state, value) {
            state.loading = value;
        },

        setProjectPath(state, payload) {
            state.projectPath = payload.path;
        },

        loadProject(state, data) {
            state.sheets = data.sheets;
            state.papers = data.papers;
            state.tags = data.tags;

            updateAutoTags(state);
        },

        addPapers(state, payload) {
            payload.papers.sort((a, b) => {
                if (typeof a.year === 'number' && typeof b.year === 'number') {
                    return b.year - a.year;
                }
                if (typeof a.year === 'string' && typeof b.year === 'number') {
                    return 1;
                }
                if (typeof a.year === 'number' && typeof b.year === 'string') {
                    return -1;
                }
                return 0;
            });

            payload.papers.forEach((paperData) => {
                const paper = { ...paperData };

                paper.tags = [];
                paper.include = false;
                paper.decision = 'undecided';
                paper.notes = '';
                paper.comments = [];
                paper.sheets = [];

                if (!state.papers[paper.id]) {
                    state.papers[paper.id] = paper;
                    if (!state.sheets[payload.sheet].papers.includes(paper.id)) {
                        state.sheets[payload.sheet].papers.push(paper.id);
                    }
                    if (!paper.sheets.includes(payload.sheet)) {
                        paper.sheets.push(payload.sheet);
                    }
                }
            });

            updateAutoTags(state);
        },

        updatePaper(state, payload) {
            let papers = payload.paper;
            if (!Array.isArray(payload.paper)) {
                papers = [payload.paper];
            }
            papers.forEach((paper) => {
                if (!state.papers[paper]) return;
                Object.entries(payload.updates).forEach(([key, value]) => {
                    state.papers[paper][key] = value;
                });
            });
        },

        addTag(state, tag) {
            state.tags[tag.id] = tag;
            updateAutoTags(state);
        },

        updateTag(state, payload) {
            let tags = payload.tag;
            if (!Array.isArray(payload.tag)) {
                tags = [payload.tag];
            }
            tags.forEach((tag) => {
                if (!state.tags[tag]) return;
                Object.entries(payload.updates).forEach(([key, value]) => {
                    state.tags[tag][key] = value;
                });
            });
        },

        deleteTag(state, tag) {
            delete state.tags[tag.id];
            updateAutoTags(state);
        },

        addSheet(state, sheet) {
            state.sheets[sheet.id] = {
                id: sheet.id,
                name: sheet.name,
                papers: sheet.papers,
            };
        },
    },
    actions: {},
    modules: {},
    plugins: [filePersistence, historyTracking],
});
