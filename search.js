// Global variables
let allLessons = [];
let filteredLessons = [];
let currentPage = 0;
const LESSONS_PER_PAGE = 20;
let currentView = 'grid'; // 'grid' or 'list'
let activeFilters = {};
let lunrIndex = null; // Lunr search index

// Cultural heritage hierarchy for search
const CULTURAL_HIERARCHY = {
    'Asian': ['East Asian', 'Southeast Asian', 'South Asian', 'Central Asian', 'Chinese', 'Japanese', 'Korean', 'Taiwanese', 'Vietnamese', 'Filipino', 'Malaysian', 'Thai', 'Indian', 'Bengali', 'Pakistani', 'Uzbek'],
    'East Asian': ['Chinese', 'Japanese', 'Korean', 'Taiwanese'],
    'Southeast Asian': ['Vietnamese', 'Filipino', 'Malaysian', 'Thai'],
    'South Asian': ['Indian', 'Bengali', 'Pakistani'],
    'Central Asian': ['Uzbek'],
    'Americas': ['Latin American', 'Caribbean', 'North American', 'Mexican', 'Dominican', 'Puerto Rican', 'Salvadoran', 'Jamaican', 'Cajun/Creole', 'Indigenous/Native American', 'African American diaspora'],
    'Latin American': ['Mexican', 'Dominican', 'Puerto Rican', 'Salvadoran'],
    'Caribbean': ['Jamaican', 'Dominican', 'Puerto Rican'],
    'North American': ['Cajun/Creole', 'Indigenous/Native American', 'African American diaspora'],
    'African': ['West African', 'Ethiopian', 'Nigerian'],
    'European': ['Eastern European', 'Mediterranean', 'Italian', 'Spanish', 'Greek', 'French', 'Russian/Ukrainian', 'Polish'],
    'Mediterranean': ['Italian', 'Spanish', 'Greek'],
    'Eastern European': ['Russian/Ukrainian', 'Polish'],
    'Middle Eastern': ['Levantine', 'Palestinian', 'Lebanese', 'Syrian', 'Jordanian', 'Israeli'],
    'Levantine': ['Palestinian', 'Lebanese', 'Syrian', 'Jordanian']
};

// Ingredient groupings for search
const INGREDIENT_GROUPS = {
    'Root vegetables': ['potatoes', 'carrots', 'beets', 'turnips', 'radishes'],
    'Winter squash': ['butternut', 'honeynut', 'pumpkin', 'acorn squash', 'kabocha'],
    'Leafy greens': ['collards', 'kale', 'lettuce', 'spinach', 'chard'],
    'Nightshades': ['tomatoes', 'peppers', 'eggplant'],
    'Alliums': ['onions', 'garlic', 'scallions', 'leeks'],
    'Cruciferous': ['cauliflower', 'cabbage', 'broccoli', 'brussels sprouts']
};

// Load lessons when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('./data/consolidated_lessons.json');
        allLessons = await response.json();
        filteredLessons = [...allLessons];
        
        // Build Lunr search index
        lunrIndex = lunr(function() {
            this.ref('index');
            this.field('title', { boost: 10 });
            this.field('summary', { boost: 5 });
            this.field('ingredients');
            this.field('themes');
            this.field('cultural');
            
            allLessons.forEach((lesson, index) => {
                // Pre-process text to handle numbers
                const processText = (text) => {
                    if (!text) return '';
                    return text.toString()
                        .replace(/\b3\b/g, 'three')
                        .replace(/\b1st\b/gi, 'first')
                        .replace(/\b2nd\b/gi, 'second')
                        .replace(/\b3rd\b/gi, 'third');
                };
                
                this.add({
                    index: index,
                    title: processText(lesson.lessonTitle),
                    summary: processText(lesson.lessonSummary),
                    ingredients: processText((lesson.metadata.mainIngredients || []).join(' ')),
                    themes: lesson.metadata.thematicCategories.join(' '),
                    cultural: (lesson.metadata.culturalHeritage || []).join(' ')
                });
            });
        });
        
        updateFilterCounts();
        displayResults();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading lessons:', error);
        document.getElementById('resultsContainer').innerHTML = 
            '<p class="error">Error loading lessons. Please ensure consolidated_lessons.json is available.</p>';
    }
});

// Setup all event listeners
function setupEventListeners() {
    // Search button
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    
    // Enter key in search input
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Clear all filters button
    document.getElementById('clearAllFilters').addEventListener('click', clearAllFilters);
    
    // Advanced filters toggle
    document.getElementById('advancedToggle').addEventListener('click', toggleAdvancedFilters);
    
    // Collapsible filter groups
    document.querySelectorAll('.filter-header').forEach(header => {
        header.addEventListener('click', toggleFilterGroup);
    });
    
    // Quick filter buttons
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.addEventListener('click', applyQuickFilter);
    });
    
    // Grade group expand buttons
    document.querySelectorAll('.expand-grades-btn').forEach(btn => {
        btn.addEventListener('click', toggleGradeGroup);
    });
    
    // Grade group checkboxes
    document.querySelectorAll('.grade-group-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleGradeGroupChange);
    });
    
    // Cultural heritage toggles
    document.querySelectorAll('.cultural-toggle').forEach(btn => {
        btn.addEventListener('click', toggleCulturalRegion);
    });
    
    // Prevent cultural region checkboxes from triggering toggle
    document.querySelectorAll('.region-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
    
    // View toggle buttons
    document.getElementById('cardViewBtn').addEventListener('click', () => setView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));
    
    // Mobile filter toggle
    document.getElementById('mobileFilterToggle').addEventListener('click', () => {
        document.querySelector('.filters-sidebar').classList.add('active');
    });
    
    document.getElementById('mobileSidebarClose').addEventListener('click', () => {
        document.querySelector('.filters-sidebar').classList.remove('active');
    });
    
    // Sort dropdown
    document.getElementById('sortBy').addEventListener('change', () => {
        sortResults();
        displayResults();
    });
    
    // Load more button
    document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportResults);
    
    // All filter checkboxes and selects
    document.querySelectorAll('input[type="checkbox"], input[type="radio"], select').forEach(element => {
        element.addEventListener('change', performSearch);
    });
    
    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('lessonModal')) {
            closeModal();
        }
    });
}

// Toggle filter group collapse
function toggleFilterGroup(e) {
    const header = e.currentTarget;
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', !isExpanded);
    
    const content = document.getElementById(header.getAttribute('aria-controls'));
    content.style.display = isExpanded ? 'none' : 'block';
}

// Toggle grade group
function toggleGradeGroup(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const gradeGroup = btn.closest('.grade-group-item');
    const individualGrades = gradeGroup.querySelector('.individual-grades');
    const isExpanded = individualGrades.style.display !== 'none';
    
    individualGrades.style.display = isExpanded ? 'none' : 'block';
    btn.setAttribute('aria-expanded', !isExpanded);
}

// Handle grade group checkbox changes
function handleGradeGroupChange(e) {
    const checkbox = e.currentTarget;
    const grades = checkbox.dataset.grades.split(',');
    const gradeGroup = checkbox.closest('.grade-group-item');
    const individualCheckboxes = gradeGroup.querySelectorAll('.individual-grades input[type="checkbox"]');
    
    individualCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    performSearch();
}

// Toggle cultural region
function toggleCulturalRegion(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const region = btn.closest('.cultural-region');
    const subregions = region.querySelector('.cultural-subregions');
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    
    btn.setAttribute('aria-expanded', !isExpanded);
    subregions.style.display = isExpanded ? 'none' : 'block';
}

// Apply quick filter
function applyQuickFilter(e) {
    const btn = e.currentTarget;
    const filter = btn.dataset.filter;
    const [type, value] = filter.split(':');
    
    // Clear existing filters
    clearAllFilters();
    
    // Apply the quick filter
    switch(type) {
        case 'grade':
            document.querySelector(`#gradeLevelFilters input[value="${value}"]`).checked = true;
            break;
        case 'theme':
            document.querySelector(`#thematicFilters input[value="${value}"]`).checked = true;
            break;
        case 'cooking':
            document.querySelector(`input[name="hasCooking"][value="${value}"]`).checked = true;
            break;
        case 'season':
            document.querySelector(`#seasonFilters input[value="${value}"]`).checked = true;
            break;
    }
    
    performSearch();
}

// Set view mode
function setView(mode) {
    currentView = mode;
    document.getElementById('cardViewBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
    
    const container = document.getElementById('resultsContainer');
    container.classList.toggle('results-grid', mode === 'grid');
    container.classList.toggle('results-list', mode === 'list');
    
    displayResults();
}

// Update filter counts
function updateFilterCounts() {
    // Grade level counts
    const gradeCounts = {};
    allLessons.forEach(lesson => {
        lesson.metadata.gradeLevel.forEach(grade => {
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#gradeLevelFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = gradeCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    // Update filter group headers
    updateFilterGroupCount('gradeCount', Object.keys(gradeCounts).length);
    
    // Theme counts
    const themeCounts = {};
    allLessons.forEach(lesson => {
        lesson.metadata.thematicCategories.forEach(theme => {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#thematicFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = themeCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    updateFilterGroupCount('themeCount', Object.keys(themeCounts).length);
    
    // Season counts
    const seasonCounts = {};
    allLessons.forEach(lesson => {
        lesson.metadata.seasonTiming.forEach(season => {
            seasonCounts[season] = (seasonCounts[season] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#seasonFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        if (checkbox.value) {
            const count = seasonCounts[checkbox.value] || 0;
            const countSpan = label.querySelector('.count');
            if (countSpan) countSpan.textContent = `(${count})`;
        }
    });
    
    updateFilterGroupCount('seasonCount', Object.keys(seasonCounts).length);
    
    // Competency counts
    const competencyCounts = {};
    allLessons.forEach(lesson => {
        lesson.metadata.coreCompetencies.forEach(comp => {
            competencyCounts[comp] = (competencyCounts[comp] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#competencyFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = competencyCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    updateFilterGroupCount('competencyCount', Object.keys(competencyCounts).length);
    
    // Location counts
    const locationCounts = {};
    allLessons.forEach(lesson => {
        lesson.metadata.locationRequirements.forEach(loc => {
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#locationFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = locationCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    updateFilterGroupCount('locationCount', Object.keys(locationCounts).length);
    
    // Activity type counts
    const cookingCount = allLessons.filter(l => l.metadata.cookingSkills?.length > 0).length;
    const gardenCount = allLessons.filter(l => l.metadata.gardenSkills?.length > 0).length;
    const noCookingCount = allLessons.filter(l => !l.metadata.cookingSkills || l.metadata.cookingSkills.length === 0).length;
    
    document.getElementById('cookingCount').textContent = `(${cookingCount})`;
    document.getElementById('gardenCount').textContent = `(${gardenCount})`;
    document.getElementById('noCookingCount').textContent = `(${noCookingCount})`;
    
    updateFilterGroupCount('activityCount', 3);
    
    // Cultural heritage counts
    const culturalCounts = {};
    allLessons.forEach(lesson => {
        (lesson.metadata.culturalHeritage || []).forEach(culture => {
            culturalCounts[culture] = (culturalCounts[culture] || 0) + 1;
        });
    });
    
    document.querySelectorAll('.cultural-tree input[type="checkbox"]').forEach(checkbox => {
        const count = culturalCounts[checkbox.value] || 0;
        const label = checkbox.closest('label');
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    updateFilterGroupCount('culturalCount', Object.keys(culturalCounts).length);
    
    // Grade group counts
    updateGradeGroupCounts(gradeCounts);
}

function updateGradeGroupCounts(gradeCounts) {
    // Count unique lessons for each grade group
    const earlyElemGrades = ['3K', 'PK', 'K', '1', '2'];
    const elemGrades = ['3', '4', '5'];
    const middleGrades = ['6', '7', '8'];
    
    // Early Elementary (3K-2)
    const earlyElemCount = allLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => earlyElemGrades.includes(grade))
    ).length;
    document.getElementById('earlyElemCount').textContent = `(${earlyElemCount})`;
    
    // Elementary (3-5)
    const elemCount = allLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => elemGrades.includes(grade))
    ).length;
    document.getElementById('elemCount').textContent = `(${elemCount})`;
    
    // Middle School (6-8)
    const middleCount = allLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => middleGrades.includes(grade))
    ).length;
    document.getElementById('middleCount').textContent = `(${middleCount})`;
}

function updateFilterGroupCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `(${count})`;
    }
}

// Update filter counts based on current filtered results
function updateDynamicFilterCounts() {
    // Get current filter state
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedGrades = getSelectedValues('gradeLevelFilters');
    const selectedThemes = getSelectedValues('thematicFilters');
    const selectedSeasons = getSelectedValues('seasonFilters');
    const includeAllSeasons = document.getElementById('includeAllSeasons').checked;
    const selectedCompetencies = getSelectedValues('competencyFilters');
    const selectedCultures = getSelectedValues('culturalFilter');
    const selectedLocations = getSelectedValues('locationFilters');
    const selectedFormat = document.getElementById('formatFilter').value;
    const hasCooking = document.getElementById('hasCookingYes').checked;
    const hasGarden = document.getElementById('hasGardenYes').checked;
    const noCooking = document.getElementById('noCooking').checked;
    
    // Grade level counts
    const gradeCounts = {};
    filteredLessons.forEach(lesson => {
        lesson.metadata.gradeLevel.forEach(grade => {
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
    });
    
    // If no grade filters are selected, show counts for what would happen if each grade was selected
    if (selectedGrades.length === 0) {
        const potentialGradeCounts = {};
        document.querySelectorAll('#gradeLevelFilters input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.value) {
                potentialGradeCounts[checkbox.value] = allLessons.filter(lesson => {
                    // Check if lesson would match all current filters PLUS this grade
                    if (!lesson.metadata.gradeLevel.includes(checkbox.value)) return false;
                    if (searchTerm && !matchesTextSearch(lesson, searchTerm)) return false;
                    if (selectedThemes.length && !hasAnyMatch(lesson.metadata.thematicCategories, selectedThemes)) return false;
                    if (selectedSeasons.length) {
                        const lessonSeasons = lesson.metadata.seasonTiming;
                        const hasSelectedSeason = hasAnyMatch(lessonSeasons, selectedSeasons);
                        const hasAllSeasons = lessonSeasons.includes('All Seasons');
                        if (!hasSelectedSeason && !(includeAllSeasons && hasAllSeasons)) return false;
                    }
                    if (selectedCompetencies.length && !hasAnyMatch(lesson.metadata.coreCompetencies, selectedCompetencies)) return false;
                    if (selectedCultures.length && !matchesCulturalHeritage(lesson.metadata.culturalHeritage, selectedCultures)) return false;
                    if (selectedLocations.length && !hasAnyMatch(lesson.metadata.locationRequirements, selectedLocations)) return false;
                    if (selectedFormat && lesson.metadata.lessonFormat !== selectedFormat) return false;
                    if (hasCooking && (!lesson.metadata.cookingSkills || lesson.metadata.cookingSkills.length === 0)) return false;
                    if (hasGarden && (!lesson.metadata.gardenSkills || lesson.metadata.gardenSkills.length === 0)) return false;
                    if (noCooking && lesson.metadata.cookingSkills && lesson.metadata.cookingSkills.length > 0) return false;
                    return true;
                }).length;
            }
        });
        
        document.querySelectorAll('#gradeLevelFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            const count = potentialGradeCounts[checkbox.value] || 0;
            const countSpan = label.querySelector('.count');
            if (countSpan) countSpan.textContent = `(${count})`;
        });
    } else {
        // Show counts within current filtered results
        document.querySelectorAll('#gradeLevelFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            const count = gradeCounts[checkbox.value] || 0;
            const countSpan = label.querySelector('.count');
            if (countSpan) countSpan.textContent = `(${count})`;
        });
    }
    
    // Theme counts
    const themeCounts = {};
    filteredLessons.forEach(lesson => {
        lesson.metadata.thematicCategories.forEach(theme => {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
    });
    
    // If no theme filters are selected, show potential counts
    if (selectedThemes.length === 0) {
        const potentialThemeCounts = {};
        document.querySelectorAll('#thematicFilters input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.value) {
                potentialThemeCounts[checkbox.value] = allLessons.filter(lesson => {
                    if (!lesson.metadata.thematicCategories.includes(checkbox.value)) return false;
                    if (searchTerm && !matchesTextSearch(lesson, searchTerm)) return false;
                    if (selectedGrades.length && !hasAnyMatch(lesson.metadata.gradeLevel, selectedGrades)) return false;
                    if (selectedSeasons.length) {
                        const lessonSeasons = lesson.metadata.seasonTiming;
                        const hasSelectedSeason = hasAnyMatch(lessonSeasons, selectedSeasons);
                        const hasAllSeasons = lessonSeasons.includes('All Seasons');
                        if (!hasSelectedSeason && !(includeAllSeasons && hasAllSeasons)) return false;
                    }
                    if (selectedCompetencies.length && !hasAnyMatch(lesson.metadata.coreCompetencies, selectedCompetencies)) return false;
                    if (selectedCultures.length && !matchesCulturalHeritage(lesson.metadata.culturalHeritage, selectedCultures)) return false;
                    if (selectedLocations.length && !hasAnyMatch(lesson.metadata.locationRequirements, selectedLocations)) return false;
                    if (selectedFormat && lesson.metadata.lessonFormat !== selectedFormat) return false;
                    if (hasCooking && (!lesson.metadata.cookingSkills || lesson.metadata.cookingSkills.length === 0)) return false;
                    if (hasGarden && (!lesson.metadata.gardenSkills || lesson.metadata.gardenSkills.length === 0)) return false;
                    if (noCooking && lesson.metadata.cookingSkills && lesson.metadata.cookingSkills.length > 0) return false;
                    return true;
                }).length;
            }
        });
        
        document.querySelectorAll('#thematicFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            const count = potentialThemeCounts[checkbox.value] || 0;
            const countSpan = label.querySelector('.count');
            if (countSpan) countSpan.textContent = `(${count})`;
        });
    } else {
        document.querySelectorAll('#thematicFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            const count = themeCounts[checkbox.value] || 0;
            const countSpan = label.querySelector('.count');
            if (countSpan) countSpan.textContent = `(${count})`;
        });
    }
    
    // Season counts
    const seasonCounts = {};
    filteredLessons.forEach(lesson => {
        lesson.metadata.seasonTiming.forEach(season => {
            seasonCounts[season] = (seasonCounts[season] || 0) + 1;
        });
    });
    
    if (selectedSeasons.length === 0) {
        const potentialSeasonCounts = {};
        document.querySelectorAll('#seasonFilters input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.value) {
                potentialSeasonCounts[checkbox.value] = allLessons.filter(lesson => {
                    const lessonSeasons = lesson.metadata.seasonTiming;
                    if (!lessonSeasons.includes(checkbox.value) && !(includeAllSeasons && lessonSeasons.includes('All Seasons'))) return false;
                    if (searchTerm && !matchesTextSearch(lesson, searchTerm)) return false;
                    if (selectedGrades.length && !hasAnyMatch(lesson.metadata.gradeLevel, selectedGrades)) return false;
                    if (selectedThemes.length && !hasAnyMatch(lesson.metadata.thematicCategories, selectedThemes)) return false;
                    if (selectedCompetencies.length && !hasAnyMatch(lesson.metadata.coreCompetencies, selectedCompetencies)) return false;
                    if (selectedCultures.length && !matchesCulturalHeritage(lesson.metadata.culturalHeritage, selectedCultures)) return false;
                    if (selectedLocations.length && !hasAnyMatch(lesson.metadata.locationRequirements, selectedLocations)) return false;
                    if (selectedFormat && lesson.metadata.lessonFormat !== selectedFormat) return false;
                    if (hasCooking && (!lesson.metadata.cookingSkills || lesson.metadata.cookingSkills.length === 0)) return false;
                    if (hasGarden && (!lesson.metadata.gardenSkills || lesson.metadata.gardenSkills.length === 0)) return false;
                    if (noCooking && lesson.metadata.cookingSkills && lesson.metadata.cookingSkills.length > 0) return false;
                    return true;
                }).length;
            }
        });
        
        document.querySelectorAll('#seasonFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            if (checkbox.value) {
                const count = potentialSeasonCounts[checkbox.value] || 0;
                const countSpan = label.querySelector('.count');
                if (countSpan) countSpan.textContent = `(${count})`;
            }
        });
    } else {
        document.querySelectorAll('#seasonFilters label').forEach(label => {
            const checkbox = label.querySelector('input');
            if (checkbox.value) {
                const count = seasonCounts[checkbox.value] || 0;
                const countSpan = label.querySelector('.count');
                if (countSpan) countSpan.textContent = `(${count})`;
            }
        });
    }
    
    // Competency counts
    const competencyCounts = {};
    filteredLessons.forEach(lesson => {
        lesson.metadata.coreCompetencies.forEach(comp => {
            competencyCounts[comp] = (competencyCounts[comp] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#competencyFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = competencyCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    // Location counts
    const locationCounts = {};
    filteredLessons.forEach(lesson => {
        lesson.metadata.locationRequirements.forEach(loc => {
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
    });
    
    document.querySelectorAll('#locationFilters label').forEach(label => {
        const checkbox = label.querySelector('input');
        const count = locationCounts[checkbox.value] || 0;
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    // Activity type counts
    const cookingCount = filteredLessons.filter(l => l.metadata.cookingSkills?.length > 0).length;
    const gardenCount = filteredLessons.filter(l => l.metadata.gardenSkills?.length > 0).length;
    const noCookingCount = filteredLessons.filter(l => !l.metadata.cookingSkills || l.metadata.cookingSkills.length === 0).length;
    
    document.getElementById('cookingCount').textContent = `(${cookingCount})`;
    document.getElementById('gardenCount').textContent = `(${gardenCount})`;
    document.getElementById('noCookingCount').textContent = `(${noCookingCount})`;
    
    // Cultural heritage counts
    const culturalCounts = {};
    filteredLessons.forEach(lesson => {
        (lesson.metadata.culturalHeritage || []).forEach(culture => {
            culturalCounts[culture] = (culturalCounts[culture] || 0) + 1;
        });
    });
    
    document.querySelectorAll('.cultural-tree input[type="checkbox"]').forEach(checkbox => {
        const count = culturalCounts[checkbox.value] || 0;
        const label = checkbox.closest('label');
        const countSpan = label.querySelector('.count');
        if (countSpan) countSpan.textContent = `(${count})`;
    });
    
    // Update grade group counts based on filtered results
    updateDynamicGradeGroupCounts();
}

function updateDynamicGradeGroupCounts() {
    const earlyElemGrades = ['3K', 'PK', 'K', '1', '2'];
    const elemGrades = ['3', '4', '5'];
    const middleGrades = ['6', '7', '8'];
    
    // Count from filtered lessons
    const earlyElemCount = filteredLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => earlyElemGrades.includes(grade))
    ).length;
    document.getElementById('earlyElemCount').textContent = `(${earlyElemCount})`;
    
    const elemCount = filteredLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => elemGrades.includes(grade))
    ).length;
    document.getElementById('elemCount').textContent = `(${elemCount})`;
    
    const middleCount = filteredLessons.filter(lesson => 
        lesson.metadata.gradeLevel.some(grade => middleGrades.includes(grade))
    ).length;
    document.getElementById('middleCount').textContent = `(${middleCount})`;
}

// Update active filters display
function updateActiveFilters() {
    activeFilters = {};
    
    // Collect all active filters
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm) {
        activeFilters['Search'] = searchTerm;
    }
    
    // Grade levels
    const grades = getSelectedValues('gradeLevelFilters');
    if (grades.length) {
        activeFilters['Grades'] = grades.join(', ');
    }
    
    // Themes
    const themes = getSelectedValues('thematicFilters');
    if (themes.length) {
        activeFilters['Themes'] = themes.join(', ');
    }
    
    // Seasons
    const seasons = getSelectedValues('seasonFilters');
    if (seasons.length) {
        activeFilters['Seasons'] = seasons.join(', ');
    }
    
    // Competencies
    const competencies = getSelectedValues('competencyFilters');
    if (competencies.length) {
        activeFilters['Competencies'] = competencies.length + ' selected';
    }
    
    // Cultural heritage
    const cultures = getSelectedValues('culturalFilter');
    if (cultures.length) {
        activeFilters['Cultures'] = cultures.join(', ');
    }
    
    // Location
    const locations = getSelectedValues('locationFilters');
    if (locations.length) {
        activeFilters['Location'] = locations.join(', ');
    }
    
    // Activity type
    const activities = [];
    if (document.getElementById('hasCookingYes').checked) activities.push('Has Cooking');
    if (document.getElementById('hasGardenYes').checked) activities.push('Has Garden');
    if (document.getElementById('noCooking').checked) activities.push('No Cooking');
    if (activities.length) {
        activeFilters['Activities'] = activities.join(', ');
    }
    
    // Update display
    const container = document.getElementById('activeFilters');
    const list = document.getElementById('activeFiltersList');
    
    if (Object.keys(activeFilters).length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    list.innerHTML = Object.entries(activeFilters).map(([key, value]) => 
        `<span class="filter-badge">${key}: ${value} <span class="remove" data-filter="${key}">×</span></span>`
    ).join('');
    
    // Add remove handlers
    list.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            removeFilter(e.currentTarget.dataset.filter);
        });
    });
    
    // Update search summary
    updateSearchSummary();
}

function removeFilter(filterType) {
    switch(filterType) {
        case 'Search':
            document.getElementById('searchInput').value = '';
            break;
        case 'Grades':
            document.querySelectorAll('#gradeLevelFilters input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Themes':
            document.querySelectorAll('#thematicFilters input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Seasons':
            document.querySelectorAll('#seasonFilters input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Competencies':
            document.querySelectorAll('#competencyFilters input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Cultures':
            document.querySelectorAll('#culturalFilter input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Location':
            document.querySelectorAll('#locationFilters input:checked').forEach(cb => cb.checked = false);
            break;
        case 'Activities':
            document.getElementById('hasCookingYes').checked = false;
            document.getElementById('hasGardenYes').checked = false;
            document.getElementById('noCooking').checked = false;
            break;
    }
    performSearch();
}

function updateSearchSummary() {
    const summary = document.getElementById('searchSummary');
    const parts = [];
    
    if (activeFilters['Search']) {
        parts.push(`containing "${activeFilters['Search']}"`);
    }
    if (activeFilters['Grades']) {
        parts.push(`for ${activeFilters['Grades']}`);
    }
    if (activeFilters['Themes']) {
        parts.push(`in ${activeFilters['Themes']}`);
    }
    if (activeFilters['Seasons']) {
        parts.push(`for ${activeFilters['Seasons']}`);
    }
    
    summary.textContent = parts.length ? 'Showing lessons ' + parts.join(', ') : '';
}

// Main search function
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Start with all lessons
    filteredLessons = allLessons.filter(lesson => {
        // Text search
        if (searchTerm && !matchesTextSearch(lesson, searchTerm)) {
            return false;
        }
        
        // Grade level filter
        const selectedGrades = getSelectedValues('gradeLevelFilters');
        if (selectedGrades.length && !hasAnyMatch(lesson.metadata.gradeLevel, selectedGrades)) {
            return false;
        }
        
        // Thematic categories filter
        const selectedThemes = getSelectedValues('thematicFilters');
        if (selectedThemes.length && !hasAnyMatch(lesson.metadata.thematicCategories, selectedThemes)) {
            return false;
        }
        
        // Season filter (with special All Seasons logic)
        const selectedSeasons = getSelectedValues('seasonFilters');
        const includeAllSeasons = document.getElementById('includeAllSeasons').checked;
        if (selectedSeasons.length) {
            const lessonSeasons = lesson.metadata.seasonTiming;
            const hasSelectedSeason = hasAnyMatch(lessonSeasons, selectedSeasons);
            const hasAllSeasons = lessonSeasons.includes('All Seasons');
            
            if (!hasSelectedSeason && !(includeAllSeasons && hasAllSeasons)) {
                return false;
            }
        }
        
        // Core competencies filter
        const selectedCompetencies = getSelectedValues('competencyFilters');
        if (selectedCompetencies.length && !hasAnyMatch(lesson.metadata.coreCompetencies, selectedCompetencies)) {
            return false;
        }
        
        // Cultural heritage filter (with hierarchy)
        const selectedCultures = getSelectedValues('culturalFilter');
        if (selectedCultures.length && !matchesCulturalHeritage(lesson.metadata.culturalHeritage, selectedCultures)) {
            return false;
        }
        
        // Location filter
        const selectedLocations = getSelectedValues('locationFilters');
        if (selectedLocations.length && !hasAnyMatch(lesson.metadata.locationRequirements, selectedLocations)) {
            return false;
        }
        
        // Format filter
        const selectedFormat = document.getElementById('formatFilter').value;
        if (selectedFormat && lesson.metadata.lessonFormat !== selectedFormat) {
            return false;
        }
        
        // Activity type filters
        const hasCooking = document.getElementById('hasCookingYes').checked;
        const hasGarden = document.getElementById('hasGardenYes').checked;
        const noCooking = document.getElementById('noCooking').checked;
        
        if (hasCooking && (!lesson.metadata.cookingSkills || lesson.metadata.cookingSkills.length === 0)) {
            return false;
        }
        if (hasGarden && (!lesson.metadata.gardenSkills || lesson.metadata.gardenSkills.length === 0)) {
            return false;
        }
        if (noCooking && lesson.metadata.cookingSkills && lesson.metadata.cookingSkills.length > 0) {
            return false;
        }
        
        return true;
    });
    
    // Reset pagination
    currentPage = 0;
    
    // Sort results
    sortResults();
    
    // Update active filters display
    updateActiveFilters();
    
    // Update filter counts based on current results
    updateDynamicFilterCounts();
    
    // Display results
    displayResults();
}

// Text search helper
function matchesTextSearch(lesson, searchTerm) {
    // First check ingredient groups (keep existing functionality)
    for (const [group, ingredients] of Object.entries(INGREDIENT_GROUPS)) {
        if (ingredients.some(ing => ing.includes(searchTerm))) {
            if ((lesson.metadata.mainIngredients || []).includes(group)) {
                return true;
            }
        }
    }
    
    // Use Lunr search if index is available
    if (lunrIndex) {
        try {
            // Pre-process search term to handle numbers
            const processedTerm = searchTerm
                .replace(/\b3\b/g, 'three')
                .replace(/\b1st\b/gi, 'first')
                .replace(/\b2nd\b/gi, 'second')
                .replace(/\b3rd\b/gi, 'third');
            
            // Search with Lunr
            const results = lunrIndex.search(processedTerm);
            
            // Check if this lesson is in the results
            const lessonIndex = allLessons.indexOf(lesson);
            return results.some(result => parseInt(result.ref) === lessonIndex);
        } catch (e) {
            // If Lunr search fails, fall back to simple search
            console.warn('Lunr search failed:', e);
        }
    }
    
    // Fallback to simple includes search
    const searchableText = [
        lesson.lessonTitle,
        lesson.lessonSummary,
        ...(lesson.metadata.mainIngredients || []),
        ...(lesson.metadata.thematicCategories || []),
        ...(lesson.metadata.culturalHeritage || [])
    ].join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm);
}

// Cultural heritage matching with hierarchy
function matchesCulturalHeritage(lessonCultures, selectedCultures) {
    if (!lessonCultures || lessonCultures.length === 0) return false;
    
    for (const selected of selectedCultures) {
        // Direct match
        if (lessonCultures.includes(selected)) return true;
        
        // Check if lesson has any descendants of selected culture
        const descendants = CULTURAL_HIERARCHY[selected] || [];
        if (lessonCultures.some(culture => descendants.includes(culture))) {
            return true;
        }
    }
    
    return false;
}

// Get selected checkbox values
function getSelectedValues(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} input:checked`))
        .map(cb => cb.value);
}

// Check if arrays have any matching values
function hasAnyMatch(arr1, arr2) {
    if (!arr1 || !arr2) return false;
    return arr1.some(item => arr2.includes(item));
}

// Sort results
function sortResults() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredLessons.sort((a, b) => {
        switch(sortBy) {
            case 'title':
                return a.lessonTitle.localeCompare(b.lessonTitle);
            case 'confidence':
                return b.confidence.overall - a.confidence.overall;
            case 'grade':
                const gradeOrder = ['3K', 'PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', 'High School'];
                const aMin = Math.min(...a.metadata.gradeLevel.map(g => gradeOrder.indexOf(g)));
                const bMin = Math.min(...b.metadata.gradeLevel.map(g => gradeOrder.indexOf(g)));
                return aMin - bMin;
            case 'modified':
                return new Date(b.lastModified) - new Date(a.lastModified);
            default:
                return 0;
        }
    });
}

// Display results
function displayResults() {
    const container = document.getElementById('resultsContainer');
    const countElement = document.getElementById('resultCount');
    
    // Update count
    countElement.textContent = filteredLessons.length;
    
    if (filteredLessons.length === 0) {
        container.innerHTML = '<p class="no-results">No lessons found matching your criteria. Try adjusting your filters.</p>';
        document.getElementById('loadMoreContainer').style.display = 'none';
        return;
    }
    
    // Get lessons to display
    const startIdx = 0;
    const endIdx = (currentPage + 1) * LESSONS_PER_PAGE;
    const lessonsToShow = filteredLessons.slice(startIdx, endIdx);
    
    // Clear container for first page
    if (currentPage === 0) {
        container.innerHTML = '';
    }
    
    // Add lesson cards
    lessonsToShow.forEach(lesson => {
        const card = createLessonCard(lesson);
        container.appendChild(card);
    });
    
    // Show/hide load more button
    const hasMore = endIdx < filteredLessons.length;
    document.getElementById('loadMoreContainer').style.display = hasMore ? 'block' : 'none';
}

// Create lesson card
function createLessonCard(lesson) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.onclick = () => showLessonDetails(lesson);
    
    // Confidence level
    let confidenceClass = 'high-confidence';
    if (lesson.confidence.overall < 70) confidenceClass = 'low-confidence';
    else if (lesson.confidence.overall < 85) confidenceClass = 'medium-confidence';
    
    // Create card HTML
    card.innerHTML = `
        <div class="lesson-header">
            <h3>${lesson.lessonTitle}</h3>
            <span class="confidence-badge ${confidenceClass}">${lesson.confidence.overall}%</span>
        </div>
        <p class="lesson-summary">${lesson.lessonSummary}</p>
        <div class="lesson-meta">
            <span class="meta-item">
                <span class="meta-icon">📚</span>
                Grades: ${lesson.metadata.gradeLevel.join(', ')}
            </span>
            <span class="meta-item">
                <span class="meta-icon">📍</span>
                ${lesson.metadata.locationRequirements.join('/')}
            </span>
            ${lesson.metadata.cookingSkills?.length ? '<span class="meta-item"><span class="meta-icon">🍳</span> Cooking</span>' : ''}
            ${lesson.metadata.gardenSkills?.length ? '<span class="meta-item"><span class="meta-icon">🌱</span> Garden</span>' : ''}
        </div>
        <div class="lesson-tags">
            ${lesson.metadata.seasonTiming.map(season => 
                `<span class="tag season-tag">${season}</span>`
            ).join('')}
            ${(lesson.metadata.culturalHeritage || []).slice(0, 2).map(culture => 
                `<span class="tag culture-tag">${culture}</span>`
            ).join('')}
            ${lesson.metadata.thematicCategories.slice(0, 2).map(theme => 
                `<span class="tag theme-tag">${theme}</span>`
            ).join('')}
        </div>
        ${lesson.fileLink ? `
        <div class="lesson-link-wrapper">
            <a href="${lesson.fileLink}" target="_blank" class="lesson-link" onclick="event.stopPropagation()">
                <span class="link-icon">📄</span>
                View Lesson Plan
                <span class="external-icon">↗</span>
            </a>
        </div>
        ` : ''}
    `;
    
    return card;
}

// Load more results
function loadMore() {
    currentPage++;
    displayResults();
}

// Show lesson details in modal
function showLessonDetails(lesson) {
    const modal = document.getElementById('lessonModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="lesson-detail-header">
            <h2>${lesson.lessonTitle}</h2>
            <p>${lesson.lessonSummary}</p>
            <p><strong>Last Modified:</strong> ${new Date(lesson.lastModified).toLocaleDateString()}</p>
            <p><strong>Confidence Score:</strong> ${lesson.confidence.overall}%</p>
            ${lesson.fileLink ? `
            <div class="lesson-link-prominent">
                <a href="${lesson.fileLink}" target="_blank" class="btn-primary-link">
                    <span class="link-icon">📄</span>
                    View Full Lesson Plan
                    <span class="external-icon">↗</span>
                </a>
            </div>
            ` : ''}
        </div>
        
        <div class="lesson-detail-content">
            <h3>Lesson Details</h3>
            
            <div class="metadata-grid">
                <div class="metadata-section">
                    <h4>Grade Levels</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.gradeLevel.map(grade => 
                            `<span class="metadata-tag">${grade}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="metadata-section">
                    <h4>Thematic Categories</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.thematicCategories.map(cat => 
                            `<span class="metadata-tag">${cat}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="metadata-section">
                    <h4>Seasons</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.seasonTiming.map(season => 
                            `<span class="metadata-tag">${season}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="metadata-section">
                    <h4>Location</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.locationRequirements.map(loc => 
                            `<span class="metadata-tag">${loc}</span>`
                        ).join('')}
                    </div>
                </div>
                
                ${lesson.metadata.culturalHeritage?.length ? `
                <div class="metadata-section">
                    <h4>Cultural Heritage</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.culturalHeritage.map(culture => 
                            `<span class="metadata-tag">${culture}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${lesson.metadata.observancesHolidays?.length ? `
                <div class="metadata-section">
                    <h4>Observances & Holidays</h4>
                    <div class="metadata-items">
                        ${lesson.metadata.observancesHolidays.map(obs => 
                            `<span class="metadata-tag">${obs}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${lesson.metadata.academicIntegration?.selected?.length ? `
            <h3>Academic Integration</h3>
            <div class="academic-integration">
                ${Object.entries(lesson.metadata.academicIntegration.concepts || {}).map(([subject, concepts]) => `
                    <div class="subject-group">
                        <strong>${subject}:</strong> ${concepts.join(', ')}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <h3>Core Competencies</h3>
            <div class="metadata-items">
                ${lesson.metadata.coreCompetencies.map(comp => 
                    `<span class="metadata-tag">${comp}</span>`
                ).join('')}
            </div>
            
            <h3>Social-Emotional Learning</h3>
            <div class="metadata-items">
                ${lesson.metadata.socialEmotionalLearning.map(sel => 
                    `<span class="metadata-tag">${sel}</span>`
                ).join('')}
            </div>
            
            <h3>Cultural Responsiveness Features</h3>
            <div class="metadata-items">
                ${lesson.metadata.culturalResponsivenessFeatures.map(feature => 
                    `<span class="metadata-tag">${feature}</span>`
                ).join('')}
            </div>
            
            ${lesson.metadata.cookingSkills?.length ? `
            <h3>Cooking Skills</h3>
            <div class="metadata-items">
                ${lesson.metadata.cookingSkills.map(skill => 
                    `<span class="metadata-tag">${skill}</span>`
                ).join('')}
            </div>
            
            <h3>Cooking Methods</h3>
            <div class="metadata-items">
                ${(lesson.metadata.cookingMethods || []).map(method => 
                    `<span class="metadata-tag">${method}</span>`
                ).join('')}
            </div>
            
            ${lesson.metadata.mainIngredients?.length ? `
            <h3>Main Ingredients</h3>
            <div class="metadata-items">
                ${lesson.metadata.mainIngredients.map(ing => 
                    `<span class="metadata-tag">${ing}</span>`
                ).join('')}
            </div>
            ` : ''}
            ` : ''}
            
            ${lesson.metadata.gardenSkills?.length ? `
            <h3>Garden Skills</h3>
            <div class="metadata-items">
                ${lesson.metadata.gardenSkills.map(skill => 
                    `<span class="metadata-tag">${skill}</span>`
                ).join('')}
            </div>
            ` : ''}
            
            <h3>Lesson Format</h3>
            <p>${lesson.metadata.lessonFormat}</p>
            
            ${lesson.processingNotes ? `
            <h3>Processing Notes</h3>
            <p style="font-style: italic; color: #666;">${lesson.processingNotes}</p>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('lessonModal').style.display = 'none';
}

// Toggle advanced filters
function toggleAdvancedFilters() {
    const advanced = document.getElementById('advancedFilters');
    const toggle = document.getElementById('advancedToggle');
    const isVisible = advanced.style.display !== 'none';
    
    advanced.style.display = isVisible ? 'none' : 'block';
    toggle.classList.toggle('active', !isVisible);
    toggle.querySelector('.toggle-icon').textContent = isVisible ? '▶' : '▼';
}

// Clear all filters
function clearAllFilters() {
    // Clear search
    document.getElementById('searchInput').value = '';
    
    // Clear all checkboxes
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => cb.checked = false);
    
    // Reset radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.value === '') radio.checked = true;
    });
    
    // Clear selects
    document.getElementById('formatFilter').value = '';
    
    // Hide sidebar on mobile
    document.querySelector('.filters-sidebar').classList.remove('active');
    
    performSearch();
}

// Export results to CSV
function exportResults() {
    const csv = [
        // Headers
        [
            'Lesson Title',
            'Summary',
            'Grade Levels',
            'Thematic Categories',
            'Seasons',
            'Location',
            'Cultural Heritage',
            'Core Competencies',
            'Has Cooking',
            'Has Garden',
            'Confidence Score',
            'Google Drive Link'
        ].join(','),
        
        // Data rows
        ...filteredLessons.map(lesson => [
            `"${lesson.lessonTitle.replace(/"/g, '""')}"`,
            `"${lesson.lessonSummary.replace(/"/g, '""')}"`,
            `"${lesson.metadata.gradeLevel.join(', ')}"`,
            `"${lesson.metadata.thematicCategories.join(', ')}"`,
            `"${lesson.metadata.seasonTiming.join(', ')}"`,
            `"${lesson.metadata.locationRequirements.join(', ')}"`,
            `"${(lesson.metadata.culturalHeritage || []).join(', ')}"`,
            `"${lesson.metadata.coreCompetencies.join(', ')}"`,
            lesson.metadata.cookingSkills?.length > 0 ? 'Yes' : 'No',
            lesson.metadata.gardenSkills?.length > 0 ? 'Yes' : 'No',
            lesson.confidence.overall,
            lesson.fileLink || ''
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esnyc_lessons_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}