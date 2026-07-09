const defaultExamData = {
    "title": "大学英语四级考试模拟题",
    "totalTime": 110,
    "questions": {
        "reading": [
            {
                "title": "阅读理解",
                "count": 4,
                "passage": "Technology has become an integral part of modern education. From online courses to interactive learning tools, digital resources have transformed how students acquire knowledge. One of the most significant advantages is the flexibility they offer—students can learn at their own pace, review materials anytime, and access educational content from anywhere in the world.",
                "questions": [
                    {
                        "uniqueId": "reading-A-1",
                        "id": 1,
                        "title": "What is the core lesson that Bitcoin teaches us, according to the article?",
                        "options": [
                            { "id": "A", "text": "We should keep a close eye on the price fluctuations of Bitcoin to make profits." },
                            { "id": "B", "text": "Wealth is a servant of life, not its master, and we need to set boundaries between life and irrelevant wealth." },
                            { "id": "C", "text": "Bitcoin is the most valuable digital asset and we should invest more money in it." },
                            { "id": "D", "text": "We should ignore all kinds of wealth because they will disturb our peace." }
                        ],
                        "correct": "B"
                    }
                ]
            }
        ],
        "cloze": {
            "title": "完形填空",
            "count": 3,
            "passage": "Last summer, I decided to take a trip to the mountains with my friends. We packed our bags, grabbed our hiking boots, and set off early in the morning. The drive to the mountain trail was beautiful, with green fields and clear rivers on both sides of the road.",
            "blanks": [
                {
                    "uniqueId": "cloze-A-1",
                    "id": 1,
                    "text": "完形填空第①空",
                    "options": [
                        { "id": "A", "text": "boring" },
                        { "id": "B", "text": "beautiful" },
                        { "id": "C", "text": "dangerous" },
                        { "id": "D", "text": "noisy" }
                    ],
                    "correct": "B"
                }
            ]
        },
        "sevenSelectFive": {
            "title": "情景对话（七选五）",
            "count": 5,
            "dialogue": [
                { "speaker": "A", "text": "Hi Tom, are you free this weekend?" },
                { "speaker": "B", "text": "Yes, I don't have any plans. ①" }
            ],
            "options": [
                { "id": 1, "text": "What kind of books are you looking for?" },
                { "id": 2, "text": "I'd love to, but I have a busy morning." }
            ],
            "blanks": [
                { "uniqueId": "sevenSelectFive-A-1", "id": 1, "correct": 3 }
            ]
        },
        "grammar": {
            "title": "语法填空",
            "count": 3,
            "passage": "Many people dream of ① (travel) around the world. Traveling can be a great way to experience different cultures.",
            "blanks": [
                {
                    "uniqueId": "grammar-A-1",
                    "id": 1,
                    "text": "语法填空第①空（给词填空）",
                    "hint": "提示：动词原形",
                    "type": "withHint",
                    "placeholder": "请输入正确形式",
                    "correct": "traveling"
                }
            ]
        },
        "extract": {
            "title": "五、信息摘录",
            "count": 2,
            "passage": "The City Museum is one of the most popular tourist attractions in the city. It was founded in 1925 and has a collection of over 50,000 artifacts.",
            "questions": [
                {
                    "uniqueId": "extract-A-1",
                    "id": 1,
                    "type": "table",
                    "title": "信息摘录 - 表格填写",
                    "rows": [
                        {
                            "label": "开馆时间",
                            "placeholder": "请输入开馆时间",
                            "correct": "9 a.m. to 5 p.m. (Tuesday to Sunday)"
                        }
                    ]
                }
            ]
        },
        "writing": {
            "title": "六、书面表达",
            "count": 1,
            "requirements": "假设你是李华，你的英国笔友Peter来信询问你校的课外活动情况，请你根据以下要点给他回一封信：",
            "points": [
                "课外活动的种类（至少3种）",
                "你最喜欢的课外活动及原因",
                "课外活动给你带来的益处"
            ],
            "note": "注意：1. 词数不少于100词；2. 信的格式已给出，不计入总词数；3. 可适当增加细节，使行文连贯。",
            "minWords": 100,
            "blanks": [
                { "uniqueId": "writing-A-1", "id": 1 }
            ],
            "example":""
        }
    }
};
const defaultExamData2 = {
    "title": "",
    "totalTime": 120,
    "questions": {
        "reading": [
            {
                "title": "阅读理解",
                "count": 5,
                "passage": "",
                "questions": [
                    {
                        "uniqueId": "reading-A-1",
                        "id": 1,
                        "title": "",
                        "options": [
                            { "id": "A", "text": "" },
                            { "id": "B", "text": "" },
                            { "id": "C", "text": "" },
                            { "id": "D", "text": "" }
                        ],
                        "correct": ""
                    }
                ]
            }
        ],
        "cloze": {
            "title": "完形填空",
            "count": 15,
            "passage": "",
            "blanks": [
                {
                    "uniqueId": "cloze-A-1",
                    "id": 1,
                    "text": "完形填空第1空",
                    "options": [
                        { "id": "A", "text": "" },
                        { "id": "B", "text": "" },
                        { "id": "C", "text": "" },
                        { "id": "D", "text": "" }
                    ],
                    "correct": ""
                }
            ]
        },
        "sevenSelectFive": {
            "title": "情景对话（七选五）",
            "count": 5,
            "dialogue": [
                { "speaker": "A", "text": "" },
                { "speaker": "B", "text": "" }
            ],
            "options": [
                { "id": 1, "text": "" },
                { "id": 2, "text": "" }
            ],
            "blanks": [
                { "uniqueId": "sevenSelectFive-A-1", "id": 1, "correct": 3 }
            ]
        },
        "grammar": {
            "title": "语法填空",
            "count": 3,
            "passage": "",
            "blanks": [
                {
                    "uniqueId": "grammar-A-1",
                    "id": 1,
                    "text": "",
                    "hint": "",
                    "type": "withHint",
                    "placeholder": "请输入正确形式",
                    "correct": ""
                }
            ]
        },
        "extract": {
            "title": "信息摘录",
            "count": 2,
            "passage": "",
            "questions": [
                {
                    "uniqueId": "extract-A-1",
                    "id": 1,
                    "type": "table",
                    "title": "信息摘录 - 表格填写",
                    "rows": [
                        {
                            "label": "",
                            "placeholder": "",
                            "correct": ""
                        }
                    ]
                }
            ]
        },
        "writing": {
            "title": "六、书面表达",
            "count": 1,
            "requirements": "假设你是李华，你的英国笔友Peter来信询问你校的课外活动情况，请你根据以下要点给他回一封信：",
            "points": [
                "课外活动的种类（至少3种）",
                "你最喜欢的课外活动及原因",
                "课外活动给你带来的益处"
            ],
            "note": "注意：1. 词数不少于100词；2. 信的格式已给出，不计入总词数；3. 可适当增加细节，使行文连贯。",
            "minWords": 100,
            "blanks": [
                { "uniqueId": "writing-A-1", "id": 1 }
            ],
            "example":""
        }
    }
};
//--------------------------------------------

let currentExamData = null;
let currentQuestionType = null;


const questionTypes = [
    { id: "reading", name: "阅读理解", icon: "fas fa-book-reader", color: "#3498db" },
    { id: "cloze", name: "完形填空", icon: "fas fa-edit", color: "#2ecc71" },
    { id: "sevenSelectFive", name: "七选五", icon: "fas fa-comments", color: "#9b59b6" },
    { id: "grammar", name: "语法填空", icon: "fas fa-spell-check", color: "#e74c3c" },
    { id: "extract", name: "信息摘录", icon: "fas fa-clipboard-list", color: "#f39c12" },
    { id: "writing", name: "书面表达", icon: "fas fa-pencil-alt", color: "#1abc9c" }
];
function showPreviewModal() {
    if (!currentExamData) {
        showMessage('没有可预览的数据', 'error');
        return;
    }
    saveChanges();
    updatePreview();
    document.getElementById('editor-sections666').style.visibility = 'visible';
    document.body.classList.add('modal-open');
    document.getElementById('editor-sections666').addEventListener('click', function (e) {
        if (e.target === this || e.target.classList.contains('modal-close') ||
            (e.target.closest && e.target.closest('.section-header'))) {
            hidePreviewModal();
        }
    });
}


function hidePreviewModal() {
    document.getElementById('editor-sections666').style.visibility = 'hidden';
    document.body.classList.remove('modal-open');
}

function init() {
    document.getElementById('new-exam-btn').addEventListener('click', createNewExam);
    document.getElementById('load-example-btn').addEventListener('click', loadExampleExam);
    document.getElementById('download-btn').addEventListener('click', downloadExamData);
    document.getElementById('reset-btn').addEventListener('click', resetEditor);
    document.getElementById('save-changes-btn').addEventListener('click', saveChanges);
    document.getElementById('copy-json-btn').addEventListener('click', copyJsonToClipboard);
    document.getElementById('preview-modal-btn').addEventListener('click', showPreviewModal);
    const fileInput = document.getElementById('file-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    fileInput.addEventListener('change', handleFileSelect);
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#2575fc';
        fileUploadArea.style.backgroundColor = '#f8f9ff';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'white';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'white';

        if (e.dataTransfer.files.length) {
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });


    renderQuestionTypeCards();


    loadExampleExam();
}


function renderQuestionTypeCards() {
    const questionTypesContainer = document.getElementById('question-types');
    questionTypesContainer.innerHTML = '';

    questionTypes.forEach(type => {
        const card = document.createElement('div');
        card.className = 'type-card';
        card.dataset.type = type.id;
        card.innerHTML = `
                    <i class="${type.icon}"></i>
                    <h3>${type.name}</h3>
                    <p>点击编辑此题型</p>
                `;

        card.addEventListener('click', () => {
            selectQuestionType(type.id);
        });

        questionTypesContainer.appendChild(card);
    });
}


function selectQuestionType(typeId) {
    currentQuestionType = typeId;


    document.querySelectorAll('.type-card').forEach(card => {
        if (card.dataset.type === typeId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });


    renderQuestionTypeEditor(typeId);
}


function renderQuestionTypeEditor(typeId) {
    const editorContainer = document.getElementById('question-type-editor');

    if (!currentExamData || !currentExamData.questions[typeId]) {
        editorContainer.innerHTML = `<p style="color: #6c757d; text-align: center; padding: 30px;">
                    请先加载或创建考试数据
                </p>`;
        return;
    }

    const typeData = currentExamData.questions[typeId];
    let editorHtml = '';


    switch (typeId) {
        case 'reading':
            editorHtml = renderReadingEditor(typeData);
            break;
        case 'cloze':
            editorHtml = renderClozeEditor(typeData);
            break;
        case 'sevenSelectFive':
            editorHtml = renderSevenSelectFiveEditor(typeData);
            break;
        case 'grammar':
            editorHtml = renderGrammarEditor(typeData);
            break;
        case 'extract':
            editorHtml = renderExtractEditor(typeData);
            break;
        case 'writing':
            editorHtml = renderWritingEditor(typeData);
            break;
        default:
            editorHtml = `<p>未识别的题型: ${typeId}</p>`;
    }

    editorContainer.innerHTML = editorHtml;


    bindEditorEvents(typeId);
}


function renderReadingEditor(readingData) {
    let html = `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">阅读理解编辑器</h3>
                <div class="form-group">
                    <label>阅读理解标题</label>
                    <input type="text" id="reading-title" value="${readingData[0].title || '阅读理解'}">
                </div>
            `;


    readingData.forEach((section, sectionIndex) => {
        const sectionLetter = String.fromCharCode(65 + sectionIndex);

        html += `
                    <div class="reading-section" data-section-index="${sectionIndex}">
                        <div class="section-header" style="margin-top: 25px;">
                            <h4 style="color: #3498db;">阅读理解 ${sectionLetter} 篇</h4>
                            <button class="btn btn-danger btn-icon remove-section-btn" data-section-index="${sectionIndex}">
                                <i class="fas fa-trash"></i> 删除此篇
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label>文章内容</label>
                            <textarea id="reading-passage-${sectionIndex}" rows="6">${section.passage || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>题目数量</label>
                            <input type="number" id="reading-count-${sectionIndex}" value="${section.count || 1}" min="1" max="10">
                        </div>
                        
                        <div class="questions-list" id="reading-questions-${sectionIndex}">
                            <h5 style="margin-bottom: 15px; color: #2c3e50;">题目列表</h5>
                `;


        if (section.questions && section.questions.length > 0) {
            section.questions.forEach((question, questionIndex) => {
                html += renderReadingQuestion(question, sectionIndex, questionIndex);
            });
        } else {
            html += `<p style="color: #6c757d; text-align: center; padding: 20px;">暂无题目，点击下方按钮添加</p>`;
        }

        html += `
                        </div>
                        
                        <button class="btn btn-secondary add-reading-question-btn" data-section-index="${sectionIndex}">
                            <i class="fas fa-plus"></i> 添加题目
                        </button>
                    </div>
                `;
    });

    html += `
                <button class="btn btn-primary" id="add-reading-section-btn" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> 添加阅读理解篇章
                </button>
            `;

    return html;
}


function renderReadingQuestion(question, sectionIndex, questionIndex) {
    const questionId = `reading-${sectionIndex}-${questionIndex}`;

    let optionsHtml = '';
    if (question.options && question.options.length > 0) {
        question.options.forEach((option, optionIndex) => {
            optionsHtml += `
                        <div class="option-item">
                            <input type="text" class="option-id" value="${option.id || ''}" placeholder="选项ID (如: A, B, C, D)">
                            <input type="text" class="option-text" value="${option.text || ''}" placeholder="选项文本">
                            <button class="btn btn-icon remove-option-btn" data-question-id="${questionId}" data-option-index="${optionIndex}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
        });
    }

    return `
                <div class="question-item" data-question-id="${questionId}">
                    <div class="question-item-header">
                        <h5>题目 ${questionIndex + 1}</h5>
                        <div class="question-item-actions">
                            <button class="btn btn-icon edit-question-btn" data-question-id="${questionId}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon remove-question-btn" data-question-id="${questionId}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>题目</label>
                        <input type="text" class="question-title" value="${question.title || ''}" placeholder="请输入题目内容">
                    </div>
                    <div class="form-group">
                        <label>选项</label>
                        <div id="options-${questionId}">
                            ${optionsHtml}
                        </div>
                        <button class="btn btn-secondary add-option-btn" data-question-id="${questionId}" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> 添加选项
                        </button>
                    </div>
                    <div class="form-group">
                        <label>正确答案</label>
                        <select class="correct-answer" id="correct-answer-${questionId}">
                            <option value="">请选择正确答案</option>
                            ${question.options ? question.options.map(opt =>
        `<option value="${opt.id}" ${question.correct === opt.id ? 'selected' : ''}>${opt.id}</option>`
    ).join('') : ''}
                        </select>
                    </div>
                </div>
            `;
}


function renderClozeEditor(clozeData) {
    return `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">完形填空编辑器</h3>
                <div class="form-group">
                    <label>完形填空标题</label>
                    <input type="text" id="cloze-title" value="${clozeData.title || '完形填空'}">
                </div>
                
                <div class="form-group">
                    <label>文章内容</label>
                    <textarea id="cloze-passage" rows="6">${clozeData.passage || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>填空数量</label>
                    <input type="number" id="cloze-count" value="${clozeData.count || 1}" min="1" max="20">
                </div>
                
                <div class="questions-list" id="cloze-questions">
                    <h5 style="margin-bottom: 15px; color: #2c3e50;">填空题列表</h5>
                    ${clozeData.blanks && clozeData.blanks.length > 0 ?
            clozeData.blanks.map((blank, index) => renderClozeBlank(blank, index)).join('') :
            '<p style="color: #6c757d; text-align: center; padding: 20px;">暂无填空题，点击下方按钮添加</p>'}
                </div>
                
                <button class="btn btn-secondary" id="add-cloze-blank-btn">
                    <i class="fas fa-plus"></i> 添加填空题
                </button>
            `;
}


function renderClozeBlank(blank, index) {
    const blankId = `cloze-${index}`;

    let optionsHtml = '';
    if (blank.options && blank.options.length > 0) {
        blank.options.forEach((option, optionIndex) => {
            optionsHtml += `
                <div class="option-item">
                    <input type="text" class="option-id" value="${option.id || ''}" placeholder="选项ID">
                    <input type="text" class="option-text" value="${option.text || ''}" placeholder="选项文本">
                    <button class="btn btn-icon remove-option-btn" data-blank-id="${blankId}" data-option-index="${optionIndex}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
    }

    return `
        <div class="question-item" data-blank-id="${blankId}">
            <div class="question-item-header">
                <h5>填空题 ${index + 1}</h5>
                <div class="question-item-actions">
                    <button class="btn btn-icon remove-blank-btn" data-blank-id="${blankId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>题目描述</label>
                <input type="text" class="blank-text" value="${blank.text || ''}" placeholder="例如：完形填空第①空">
            </div>
            <div class="form-group">
                <label>选项</label>
                <div id="options-${blankId}">
                    ${optionsHtml}
                </div>
                <button class="btn btn-secondary add-option-btn" data-blank-id="${blankId}" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> 添加选项
                </button>
            </div>
            <div class="form-group">
                <label>正确答案</label>
                <select class="correct-answer" id="correct-answer-${blankId}">
                    <option value="">请选择正确答案</option>
                    ${blank.options ? blank.options.map(opt =>
        `<option value="${opt.id}" ${blank.correct === opt.id ? 'selected' : ''}>${opt.id}</option>`
    ).join('') : ''}
                </select>
            </div>
        </div>
    `;
}


function renderSevenSelectFiveEditor(sevenData) {
    return `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">七选五编辑器</h3>
                <div class="form-group">
                    <label>七选五标题</label>
                    <input type="text" id="seven-title" value="${sevenData.title || '情景对话（七选五）'}">
                </div>
                
                <div class="form-group">
                    <label>对话内容</label>
                    <div id="seven-dialogue">
                        ${sevenData.dialogue && sevenData.dialogue.length > 0 ?
            sevenData.dialogue.map((line, index) =>
                `<div class="option-item">
                                <input type="text" class="speaker" value="${line.speaker || ''}" placeholder="说话者 (A/B)">
                                <input type="text" class="dialogue-text" value="${line.text || ''}" placeholder="对话内容">
                                <button class="btn btn-icon remove-dialogue-btn" data-index="${index}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>`
            ).join('') :
            '<p style="color: #6c757d;">暂无对话内容</p>'}
                    </div>
                    <button class="btn btn-secondary" id="add-dialogue-btn" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> 添加对话行
                    </button>
                </div>
                
                <div class="form-group">
                    <label>选项</label>
                    <div id="seven-options">
                        ${sevenData.options && sevenData.options.length > 0 ?
            sevenData.options.map((option, index) =>
                `<div class="option-item">
                                <input type="text" class="option-id" value="${option.id || ''}" placeholder="选项ID">
                                <input type="text" class="option-text" value="${option.text || ''}" placeholder="选项文本">
                                <button class="btn btn-icon remove-option-btn" data-index="${index}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>`
            ).join('') :
            '<p style="color: #6c757d;">暂无选项</p>'}
                    </div>
                    <button class="btn btn-secondary" id="add-seven-option-btn" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> 添加选项
                    </button>
                </div>
                
                <div class="form-group">
                    <label>填空数量</label>
                    <input type="number" id="seven-count" value="${sevenData.count || 1}" min="1" max="10">
                </div>
            `;
}


function renderGrammarEditor(grammarData) {
    return `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">语法填空编辑器</h3>
                <div class="form-group">
                    <label>语法填空标题</label>
                    <input type="text" id="grammar-title" value="${grammarData.title || '语法填空'}">
                </div>
                
                <div class="form-group">
                    <label>文章内容</label>
                    <textarea id="grammar-passage" rows="6">${grammarData.passage || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>填空数量</label>
                    <input type="number" id="grammar-count" value="${grammarData.count || 1}" min="1" max="20">
                </div>
                
                <div class="questions-list" id="grammar-questions">
                    <h5 style="margin-bottom: 15px; color: #2c3e50;">填空题列表</h5>
                    ${grammarData.blanks && grammarData.blanks.length > 0 ?
            grammarData.blanks.map((blank, index) => renderGrammarBlank(blank, index)).join('') :
            '<p style="color: #6c757d; text-align: center; padding: 20px;">暂无填空题，点击下方按钮添加</p>'}
                </div>
                
                <button class="btn btn-secondary" id="add-grammar-blank-btn">
                    <i class="fas fa-plus"></i> 添加填空题
                </button>
            `;
}


function renderGrammarBlank(blank, index) {
    const blankId = `grammar-${index}`;

    return `
                <div class="question-item" data-blank-id="${blankId}">
                    <div class="question-item-header">
                        <h5>语法填空题 ${index + 1}</h5>
                        <div class="question-item-actions">
                            <button class="btn btn-icon remove-blank-btn" data-blank-id="${blankId}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>题目描述</label>
                        <input type="text" class="blank-text" value="${blank.text || ''}" placeholder="例如：语法填空第①空">
                    </div>
                    <div class="form-group">
                        <label>提示</label>
                        <input type="text" class="blank-hint" value="${blank.hint || ''}" placeholder="提示信息">
                    </div>
                    <div class="form-group">
                        <label>输入类型</label>
                        <select class="blank-type" id="blank-type-${blankId}">
                            <option value="withHint" ${blank.type === 'withHint' ? 'selected' : ''}>给词填空</option>
                            <option value="noHint" ${blank.type === 'noHint' ? 'selected' : ''}>无词填空</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>占位符</label>
                        <input type="text" class="blank-placeholder" value="${blank.placeholder || ''}" placeholder="例如：请输入正确形式">
                    </div>
                    <div class="form-group">
                        <label>正确答案</label>
                        <input type="text" class="correct-answer" value="${blank.correct || ''}" placeholder="正确答案">
                    </div>
                </div>
            `;
}


function renderExtractEditor(extractData) {
    return `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">信息摘录编辑器</h3>
                <div class="form-group">
                    <label>信息摘录标题</label>
                    <input type="text" id="extract-title" value="${extractData.title || '信息摘录'}">
                </div>
                
                <div class="form-group">
                    <label>文章内容</label>
                    <textarea id="extract-passage" rows="6">${extractData.passage || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>题目数量</label>
                    <input type="number" id="extract-count" value="${extractData.count || 1}" min="1" max="10">
                </div>
                
                <div class="questions-list" id="extract-questions">
                    <h5 style="margin-bottom: 15px; color: #2c3e50;">题目列表</h5>
                    ${extractData.questions && extractData.questions.length > 0 ?
            extractData.questions.map((question, index) => renderExtractQuestion(question, index)).join('') :
            '<p style="color: #6c757d; text-align: center; padding: 20px;">暂无题目，点击下方按钮添加</p>'}
                </div>
                
                <button class="btn btn-secondary" id="add-extract-question-btn">
                    <i class="fas fa-plus"></i> 添加题目
                </button>
            `;
}


function renderExtractQuestion(question, index) {
    const questionId = `extract-${index}`;

    
    let contentHtml = '';

    if (question.type === 'table') {

        let rowsHtml = '';
        if (question.rows && question.rows.length > 0) {
            question.rows.forEach((row, rowIndex) => {
                rowsHtml += `
                    <div class="option-item">
                        <input type="text" class="row-label" value="${row.label || ''}" placeholder="行标签">
                        <input type="text" class="row-placeholder" value="${row.placeholder || ''}" placeholder="占位符">
                        <input type="text" class="row-correct" value="${row.correct || ''}" placeholder="正确答案">
                        <button class="btn btn-icon remove-row-btn" data-question-id="${questionId}" data-row-index="${rowIndex}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        }

        contentHtml = `
            <div class="form-group">
                <label>表格行</label>
                <div id="rows-${questionId}">
                    ${rowsHtml}
                </div>
                <button class="btn btn-secondary add-row-btn" data-question-id="${questionId}" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> 添加行
                </button>
            </div>
        `;
    } else {

        contentHtml = `
            <div class="form-group">
                <label>问题</label>
                <input type="text" class="question-text" value="${question.question || ''}" placeholder="问题内容">
            </div>
            <div class="form-group">
                <label>占位符</label>
                <input type="text" class="question-placeholder" value="${question.placeholder || ''}" placeholder="占位符">
            </div>
            <div class="form-group">
                <label>最大字数</label>
                <input type="number" class="question-maxwords" value="${question.maxWords || 50}" min="10" max="500">
            </div>
            <div class="form-group">
                <label>参考答案</label>
                <textarea class="question-correct" rows="3" placeholder="参考答案（用于阅卷参考）">${question.correct || ''}</textarea>
            </div>
        `;
    }

    return `
        <div class="question-item" data-question-id="${questionId}" data-question-type="${question.type || 'table'}">
            <div class="question-item-header">
                <h5>题目 ${index + 1}</h5>
                <div class="question-item-actions">
                    <button class="btn btn-icon remove-question-btn" data-question-id="${questionId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>题目类型</label>
                <select class="question-type" id="question-type-${questionId}">
                    <option value="table" ${question.type === 'table' ? 'selected' : ''}>表格填写</option>
                    <option value="textarea" ${question.type === 'textarea' ? 'selected' : ''}>简答题</option>
                </select>
            </div>
            <div class="form-group">
                <label>题目描述</label>
                <input type="text" class="question-title" value="${question.title || ''}" placeholder="题目描述">
            </div>
            
            <div id="question-content-${questionId}">
                ${contentHtml}
            </div>
        </div>
    `;
}

function renderWritingEditor(writingData) {
    let pointsHtml = '';
    if (writingData.points && writingData.points.length > 0) {
        writingData.points.forEach((point, index) => {
            pointsHtml += `
                        <div class="option-item">
                            <input type="text" class="writing-point" value="${point}" placeholder="要点内容">
                            <button class="btn btn-icon remove-point-btn" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
        });
    }

    return `
                <h3 style="margin-bottom: 20px; color: #2c3e50;">书面表达编辑器</h3>
                <div class="form-group">
                    <label>书面表达标题</label>
                    <input type="text" id="writing-title" value="${writingData.title || '书面表达'}">
                </div>
                
                <div class="form-group">
                    <label>写作要求</label>
                    <textarea id="writing-requirements" rows="4">${writingData.requirements || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>写作要点</label>
                    <div id="writing-points">
                        ${pointsHtml}
                    </div>
                    <button class="btn btn-secondary" id="add-writing-point-btn" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> 添加要点
                    </button>
                </div>
                
                <div class="form-group">
                    <label>注意事项</label>
                    <textarea id="writing-note" rows="3">${writingData.note || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>最少字数</label>
                    <input type="number" id="writing-minwords" value="${writingData.minWords || 100}" min="50" max="500">
                </div>
                <div class="form-group">
                    <label>参考范文</label>
                    <textarea id="writing-example" rows="4">${writingData.example || ''}</textarea>
                </div>
            `;
}


function bindEditorEvents(typeId) {

    switch (typeId) {
        case 'reading':
            bindReadingEvents();
            break;
        case 'cloze':
            bindClozeEvents();
            break;
        case 'sevenSelectFive':
            bindSevenSelectFiveEvents();
            break;
        case 'grammar':
            bindGrammarEvents();
            break;
        case 'extract':
            bindExtractEvents();
            break;
        case 'writing':
            bindWritingEvents();
            break;
    }
}


function bindReadingEvents() {
    
    document.getElementById('add-reading-section-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.reading) {
            currentExamData.questions.reading = [];
        }

        const newSection = {
            title: "阅读理解",
            count: 1,
            passage: "",
            questions: []
        };

        currentExamData.questions.reading.push(newSection);
        renderQuestionTypeEditor('reading');
        showMessage('已添加新的阅读理解篇章', 'success');
    });


    document.querySelectorAll('.remove-section-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionIndex = parseInt(e.target.closest('.remove-section-btn').dataset.sectionIndex);
            if (confirm('确定要删除此阅读理解篇章吗？')) {
                currentExamData.questions.reading.splice(sectionIndex, 1);
                renderQuestionTypeEditor('reading');
                showMessage('已删除阅读理解篇章', 'success');
            }
        });
    });


    document.querySelectorAll('.add-reading-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionIndex = parseInt(e.target.closest('.add-reading-question-btn').dataset.sectionIndex);
            const section = currentExamData.questions.reading[sectionIndex];

            if (!section.questions) {
                section.questions = [];
            }

            const newQuestion = {
                uniqueId: `reading-${String.fromCharCode(65 + sectionIndex)}-${section.questions.length + 1}`,
                id: section.questions.length + 1,
                title: "",
                options: [
                    { id: "A", text: "" },
                    { id: "B", text: "" },
                    { id: "C", text: "" },
                    { id: "D", text: "" }
                ],
                correct: "A"
            };

            section.questions.push(newQuestion);
            renderQuestionTypeEditor('reading');
            showMessage('已添加新的阅读理解题目', 'success');
        });
    });


    document.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.remove-question-btn').dataset.questionId;
            const [type, sectionIndex, questionIndex] = questionId.split('-').map(Number);

            if (confirm('确定要删除此题吗？')) {
                currentExamData.questions.reading[sectionIndex].questions.splice(questionIndex, 1);
                renderQuestionTypeEditor('reading');
                showMessage('已删除题目', 'success');
            }
        });
    });


    document.querySelectorAll('.add-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.add-option-btn').dataset.questionId;
            const [type, sectionIndex, questionIndex] = questionId.split('-').map(Number);
            const question = currentExamData.questions.reading[sectionIndex].questions[questionIndex];

            if (!question.options) {
                question.options = [];
            }

            const nextId = String.fromCharCode(65 + question.options.length);
            question.options.push({ id: nextId, text: "" });

            renderQuestionTypeEditor('reading');
            showMessage('已添加选项', 'success');
        });
    });


    document.querySelectorAll('.remove-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.remove-option-btn').dataset.questionId;
            const optionIndex = parseInt(e.target.closest('.remove-option-btn').dataset.optionIndex);
            const [type, sectionIndex, questionIndex] = questionId.split('-').map(Number);
            const question = currentExamData.questions.reading[sectionIndex].questions[questionIndex];

            if (question.options.length > 1) {
                question.options.splice(optionIndex, 1);
                renderQuestionTypeEditor('reading');
                showMessage('已删除选项', 'success');
            } else {
                showMessage('至少需要保留一个选项', 'error');
            }
        });
    });
}


function bindClozeEvents() {
    
    document.getElementById('add-cloze-blank-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.cloze.blanks) {
            currentExamData.questions.cloze.blanks = [];
        }

        const newBlank = {
            uniqueId: `cloze-A-${currentExamData.questions.cloze.blanks.length + 1}`,
            id: currentExamData.questions.cloze.blanks.length + 1,
            text: `完形填空第${currentExamData.questions.cloze.blanks.length + 1}空`,
            options: [
                { id: "A", text: "" },
                { id: "B", text: "" },
                { id: "C", text: "" },
                { id: "D", text: "" }
            ],
            correct: "A"
        };

        currentExamData.questions.cloze.blanks.push(newBlank);
        renderQuestionTypeEditor('cloze');
        showMessage('已添加新的完形填空题目', 'success');
    });

    
    document.querySelectorAll('.remove-blank-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const blankId = e.target.closest('.remove-blank-btn').dataset.blankId;
            const blankIndex = parseInt(blankId.split('-')[1]);

            if (confirm('确定要删除此题吗？')) {
                currentExamData.questions.cloze.blanks.splice(blankIndex, 1);
                renderQuestionTypeEditor('cloze');
                showMessage('已删除题目', 'success');
            }
        });
    });

    
    document.addEventListener('click', (e) => {
        const addOptionBtn = e.target.closest('.add-option-btn');
        if (addOptionBtn && addOptionBtn.dataset.blankId) {
            const blankId = addOptionBtn.dataset.blankId;
            const blankIndex = parseInt(blankId.split('-')[1]);
            
            if (currentExamData.questions.cloze.blanks[blankIndex]) {
                const blank = currentExamData.questions.cloze.blanks[blankIndex];
                
                if (!blank.options) {
                    blank.options = [];
                }
                
                
                const nextId = String.fromCharCode(65 + blank.options.length);
                blank.options.push({ id: nextId, text: "" });
                
                renderQuestionTypeEditor('cloze');
                showMessage('已添加选项', 'success');
            }
        }
    });

    
    document.addEventListener('click', (e) => {
        const removeOptionBtn = e.target.closest('.remove-option-btn');
        if (removeOptionBtn && removeOptionBtn.dataset.blankId) {
            const blankId = removeOptionBtn.dataset.blankId;
            const blankIndex = parseInt(blankId.split('-')[1]);
            const optionIndex = parseInt(removeOptionBtn.dataset.optionIndex);
            
            if (currentExamData.questions.cloze.blanks[blankIndex]) {
                const blank = currentExamData.questions.cloze.blanks[blankIndex];
                
                if (blank.options && blank.options.length > 1) {
                    blank.options.splice(optionIndex, 1);
                    
                    
                    blank.options.forEach((opt, idx) => {
                        opt.id = String.fromCharCode(65 + idx);
                    });
                    
                    
                    if (blank.correct === String.fromCharCode(65 + optionIndex)) {
                        blank.correct = blank.options[0]?.id || "A";
                    }
                    
                    renderQuestionTypeEditor('cloze');
                    showMessage('已删除选项', 'success');
                } else {
                    showMessage('至少需要保留一个选项', 'error');
                }
            }
        }
    });
}


function bindSevenSelectFiveEvents() {
    
    document.getElementById('add-dialogue-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.sevenSelectFive.dialogue) {
            currentExamData.questions.sevenSelectFive.dialogue = [];
        }

        currentExamData.questions.sevenSelectFive.dialogue.push({
            speaker: "A",
            text: ""
        });

        renderQuestionTypeEditor('sevenSelectFive');
        showMessage('已添加对话行', 'success');
    });

    
    document.querySelectorAll('.remove-dialogue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.remove-dialogue-btn').dataset.index);
            
            if (confirm('确定要删除此对话行吗？')) {
                if (currentExamData.questions.sevenSelectFive.dialogue &&
                    currentExamData.questions.sevenSelectFive.dialogue.length > index) {
                    currentExamData.questions.sevenSelectFive.dialogue.splice(index, 1);
                    renderQuestionTypeEditor('sevenSelectFive');
                    showMessage('已删除对话行', 'success');
                }
            }
        });
    });

    
    document.getElementById('add-seven-option-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.sevenSelectFive.options) {
            currentExamData.questions.sevenSelectFive.options = [];
        }

        currentExamData.questions.sevenSelectFive.options.push({
            id: currentExamData.questions.sevenSelectFive.options.length + 1,
            text: ""
        });

        renderQuestionTypeEditor('sevenSelectFive');
        showMessage('已添加选项', 'success');
    });

    
    document.querySelectorAll('#seven-options .remove-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.remove-option-btn').dataset.index);
            
            if (confirm('确定要删除此选项吗？')) {
                if (currentExamData.questions.sevenSelectFive.options &&
                    currentExamData.questions.sevenSelectFive.options.length > index) {
                    currentExamData.questions.sevenSelectFive.options.splice(index, 1);
                    
                    
                    currentExamData.questions.sevenSelectFive.options.forEach((option, idx) => {
                        option.id = idx + 1;
                    });
                    
                    renderQuestionTypeEditor('sevenSelectFive');
                    showMessage('已删除选项', 'success');
                }
            }
        });
    });
}


function bindGrammarEvents() {

    document.getElementById('add-grammar-blank-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.grammar.blanks) {
            currentExamData.questions.grammar.blanks = [];
        }

        const newBlank = {
            uniqueId: `grammar-A-${currentExamData.questions.grammar.blanks.length + 1}`,
            id: currentExamData.questions.grammar.blanks.length + 1,
            text: `语法填空第${currentExamData.questions.grammar.blanks.length + 1}空`,
            hint: "提示",
            type: "withHint",
            placeholder: "请输入正确形式",
            correct: ""
        };

        currentExamData.questions.grammar.blanks.push(newBlank);
        renderQuestionTypeEditor('grammar');
        showMessage('已添加新的语法填空题目', 'success');
    });


    document.querySelectorAll('.remove-blank-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const blankId = e.target.closest('.remove-blank-btn').dataset.blankId;
            const blankIndex = parseInt(blankId.split('-')[1]);

            if (confirm('确定要删除此题吗？')) {
                currentExamData.questions.grammar.blanks.splice(blankIndex, 1);
                renderQuestionTypeEditor('grammar');
                showMessage('已删除题目', 'success');
            }
        });
    });
}

function saveCurrentExtractRows(questionIndex) {
    if (!currentExamData ||
        !currentExamData.questions.extract ||
        !currentExamData.questions.extract.questions) {
        return;
    }


    if (!currentExamData.questions.extract.questions[questionIndex]) {
        return;
    }

    const question = currentExamData.questions.extract.questions[questionIndex];


    if (question.type !== 'table') {

        if (!question.rows) {
            question.rows = [];
        }
        return;
    }


    const questionId = `extract-${questionIndex}`;
    const questionEl = document.querySelector(`[data-question-id="${questionId}"]`);

    if (!questionEl) return;

    const rowElements = questionEl.querySelectorAll('.option-item');


    const savedRows = [];

    rowElements.forEach((rowEl) => {
        const labelInput = rowEl.querySelector('.row-label');
        const placeholderInput = rowEl.querySelector('.row-placeholder');
        const correctInput = rowEl.querySelector('.row-correct');

        if (labelInput && placeholderInput && correctInput) {
            savedRows.push({
                label: labelInput.value,
                placeholder: placeholderInput.value,
                correct: correctInput.value
            });
        }
    });


    question.rows = savedRows;
}
function saveAllExtractQuestionsData() {
    if (!currentExamData || !currentExamData.questions.extract) return;

    const questionElements = document.querySelectorAll('[data-question-id^="extract-"]');

    questionElements.forEach((questionEl, index) => {
        const questionId = questionEl.dataset.questionId;
        const questionIndex = parseInt(questionId.split('-')[1]);
        saveCurrentExtractRows(questionIndex);
    });
}

function bindExtractEvents() {

    document.getElementById('add-extract-question-btn')?.addEventListener('click', () => {

        saveAllExtractQuestionsData();


        const newQuestion = {
            uniqueId: `extract-A-${currentExamData.questions.extract.questions.length + 1}`,
            id: currentExamData.questions.extract.questions.length + 1,
            type: "table",
            title: "信息摘录题目",
            rows: [
                {
                    label: "新行",
                    placeholder: "请输入信息",
                    correct: ""
                }
            ]
        };

        currentExamData.questions.extract.questions.push(newQuestion);
        renderQuestionTypeEditor('extract');
        showMessage('已添加新的信息摘录题目', 'success');
    });




    document.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.remove-question-btn').dataset.questionId;
            const questionIndex = parseInt(questionId.split('-')[1]);

            if (confirm('确定要删除此信息摘录题目吗？')) {
                if (currentExamData.questions.extract.questions &&
                    currentExamData.questions.extract.questions.length > questionIndex) {
                    currentExamData.questions.extract.questions.splice(questionIndex, 1);
                    renderQuestionTypeEditor('extract');
                    showMessage('已删除信息摘录题目', 'success');
                }
            }
        });
    });


    document.querySelectorAll('.add-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.add-row-btn').dataset.questionId;
            const questionIndex = parseInt(questionId.split('-')[1]);
            const question = currentExamData.questions.extract.questions[questionIndex];

            if (!question.rows) {
                question.rows = [];
            }


            saveCurrentExtractRows(questionIndex);


            const newRow = {
                label: "新行",
                placeholder: "请输入信息",
                correct: ""
            };

            question.rows.push(newRow);
            renderQuestionTypeEditor('extract');
            showMessage('已添加表格行', 'success');
        });
    });


    document.querySelectorAll('.remove-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionId = e.target.closest('.remove-row-btn').dataset.questionId;
            const rowIndex = parseInt(e.target.closest('.remove-row-btn').dataset.rowIndex);
            const questionIndex = parseInt(questionId.split('-')[1]);
            const question = currentExamData.questions.extract.questions[questionIndex];

            if (question.rows && question.rows.length > 0) {
                if (confirm('确定要删除此行吗？')) {

                    saveCurrentExtractRows(questionIndex);


                    question.rows.splice(rowIndex, 1);
                    renderQuestionTypeEditor('extract');
                    showMessage('已删除表格行', 'success');
                }
            } else {
                showMessage('至少需要保留一行', 'error');
            }
        });
    });
    
document.querySelectorAll('.question-type').forEach(select => {
    select.addEventListener('change', (e) => {
        const questionId = e.target.id.replace('question-type-', '');
        const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
        const questionIndex = parseInt(questionId.split('-')[1]);

        if (questionElement && currentExamData.questions.extract.questions[questionIndex]) {
            const newType = e.target.value;
            const oldType = currentExamData.questions.extract.questions[questionIndex].type;
            
            
            if (newType === oldType) return;
            
            
            if (oldType === 'table') {
                
                saveCurrentExtractRows(questionIndex);
            } else {
                
                const questionData = currentExamData.questions.extract.questions[questionIndex];
                
                const textInput = questionElement.querySelector('.question-text');
                const placeholderInput = questionElement.querySelector('.question-placeholder');
                const maxWordsInput = questionElement.querySelector('.question-maxwords');
                const correctInput = questionElement.querySelector('.question-correct');
                
                if (textInput) {
                    questionData.question = textInput.value;
                }
                if (placeholderInput) {
                    questionData.placeholder = placeholderInput.value;
                }
                if (maxWordsInput) {
                    questionData.maxWords = parseInt(maxWordsInput.value) || 50;
                }
                if (correctInput) {
                    questionData.correct = correctInput.value;
                }
            }
            currentExamData.questions.extract.questions[questionIndex].type = newType;
            if (newType === 'textarea') {
                const oldData = currentExamData.questions.extract.questions[questionIndex];
                if (!oldData.question) oldData.question = '';
                if (!oldData.placeholder) oldData.placeholder = '';
                if (!oldData.maxWords) oldData.maxWords = 50;
                if (!oldData.correct) oldData.correct = '';
                delete oldData.rows;
            } else {
                const oldData = currentExamData.questions.extract.questions[questionIndex];
                if (!oldData.rows) {
                    oldData.rows = [
                        {
                            label: "新行",
                            placeholder: "请输入信息",
                            correct: ""
                        }
                    ];
                }
                delete oldData.question;
                delete oldData.placeholder;
                delete oldData.maxWords;
                delete oldData.correct;
            }

            
            renderQuestionTypeEditor('extract');
            showMessage(`已切换为${newType === 'table' ? '表格填写' : '简答题'}类型`, 'success');
        }
    });
});
}


function bindWritingEvents() {
    document.getElementById('add-writing-point-btn')?.addEventListener('click', () => {
        if (!currentExamData.questions.writing.points) {
            currentExamData.questions.writing.points = [];
        }
        currentExamData.questions.writing.points.push("新的写作要点");
        renderQuestionTypeEditor('writing');
        showMessage('已添加写作要点', 'success');
    });
    document.querySelectorAll('.remove-point-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.remove-point-btn').dataset.index);
            if (confirm('确定要删除此写作要点吗？')) {
                if (currentExamData.questions.writing.points &&
                    currentExamData.questions.writing.points.length > index) {
                    currentExamData.questions.writing.points.splice(index, 1);
                    renderQuestionTypeEditor('writing');
                    showMessage('已删除写作要点', 'success');
                }
            }
        });
    });
}


function createNewExam() {
    currentExamData = JSON.parse(JSON.stringify(defaultExamData2));
    loadExamData();
    showMessage('已创建新的试卷数据模板', 'success');
}


function loadExampleExam() {
    currentExamData = JSON.parse(JSON.stringify(defaultExamData));
    loadExamData();
    showMessage('已加载示例试卷数据', 'success');
}


function loadExamData() {
    if (!currentExamData) {
        showMessage('没有可加载的考试数据', 'error');
        return;
    }
    document.getElementById('editor-container').classList.remove('hidden');
    document.getElementById('file-upload-area').style.display = 'none';
    document.getElementById('download-btn').disabled = false;
    document.getElementById('exam-title').value = currentExamData.title || '';
    document.getElementById('exam-time').value = currentExamData.totalTime || 110;
    selectQuestionType('reading');
    updatePreview();
}


function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        showMessage('请选择JSON格式的文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            currentExamData = JSON.parse(e.target.result);
            loadExamData();
            showMessage('文件加载成功', 'success');
        } catch (error) {
            showMessage('文件解析失败，请检查JSON格式', 'error');
            console.error('JSON解析错误:', error);
        }
    };

    reader.readAsText(file);
}


function saveChanges() {
    if (!currentExamData) return;


    currentExamData.title = document.getElementById('exam-title').value;
    currentExamData.totalTime = parseInt(document.getElementById('exam-time').value) || 110;


    if (currentQuestionType) {
        saveCurrentQuestionTypeData();
    }


    if (currentQuestionType === 'extract') {
        saveAllExtractQuestionsData();
    }
    updatePreview();

    showMessage('更改已保存', 'success');
}


function saveCurrentQuestionTypeData() {
    if (!currentQuestionType || !currentExamData.questions[currentQuestionType]) return;

    const typeData = currentExamData.questions[currentQuestionType];

    switch (currentQuestionType) {
        case 'reading':
            saveReadingData(typeData);
            break;
        case 'cloze':
            saveClozeData(typeData);
            break;
        case 'sevenSelectFive':
            saveSevenSelectFiveData(typeData);
            break;
        case 'grammar':
            saveGrammarData(typeData);
            break;
        case 'extract':
            saveExtractData(typeData);
            break;
        case 'writing':
            saveWritingData(typeData);
            break;
    }
}


function saveReadingData() {
    const readingSections = document.querySelectorAll('.reading-section');
    
    
    if (!currentExamData.questions.reading) {
        currentExamData.questions.reading = [];
    }
    
    
    readingSections.forEach((section, sectionIndex) => {
        
        if (!currentExamData.questions.reading[sectionIndex]) {
            currentExamData.questions.reading[sectionIndex] = {
                title: "阅读理解",
                count: 0,
                passage: "",
                questions: []
            };
        }

        const sectionData = currentExamData.questions.reading[sectionIndex];

        
        const titleInput = document.getElementById('reading-title');
        if (titleInput) {
            sectionData.title = titleInput.value || '阅读理解';
        }

        
        const passageInput = document.getElementById(`reading-passage-${sectionIndex}`);
        if (passageInput) {
            sectionData.passage = passageInput.value || '';
        }

        
        const countInput = document.getElementById(`reading-count-${sectionIndex}`);
        if (countInput) {
            sectionData.count = parseInt(countInput.value) || 0;
        }

        
        const questionElements = section.querySelectorAll('.question-item');
        const questions = [];
        
        
        questionElements.forEach((questionEl, questionIndex) => {
            const questionData = {
                uniqueId: `reading-${String.fromCharCode(65 + sectionIndex)}-${questionIndex + 1}`,
                id: questionIndex + 1,
                title: "",
                options: [],
                correct: ""
            };

            
            const titleInput = questionEl.querySelector('.question-title');
            if (titleInput) {
                questionData.title = titleInput.value || '';
            }

            
            const optionElements = questionEl.querySelectorAll('.option-item');
            optionElements.forEach((optionEl, optionIndex) => {
                const optionIdInput = optionEl.querySelector('.option-id');
                const optionTextInput = optionEl.querySelector('.option-text');

                if (optionIdInput && optionTextInput) {
                    questionData.options.push({
                        id: optionIdInput.value || String.fromCharCode(65 + optionIndex),
                        text: optionTextInput.value || ''
                    });
                }
            });

            
            const correctSelect = questionEl.querySelector('.correct-answer');
            if (correctSelect) {
                questionData.correct = correctSelect.value || '';
            }

            questions.push(questionData);
        });

        
        sectionData.questions = questions;
        
        
        sectionData.count = questions.length;
    });
}


function saveClozeData() {
    const clozeData = currentExamData.questions.cloze;


    const titleInput = document.getElementById('cloze-title');
    if (titleInput) {
        clozeData.title = titleInput.value;
    }


    const passageInput = document.getElementById('cloze-passage');
    if (passageInput) {
        clozeData.passage = passageInput.value;
    }


    const countInput = document.getElementById('cloze-count');
    if (countInput) {
        clozeData.count = parseInt(countInput.value) || 1;
    }


    const blankElements = document.querySelectorAll('[data-blank-id^="cloze-"]');
    blankElements.forEach((blankEl, blankIndex) => {
        if (!clozeData.blanks[blankIndex]) return;

        const blankData = clozeData.blanks[blankIndex];


        const textInput = blankEl.querySelector('.blank-text');
        if (textInput) {
            blankData.text = textInput.value;
        }


        const optionElements = blankEl.querySelectorAll('.option-item');
        optionElements.forEach((optionEl, optionIndex) => {
            if (!blankData.options[optionIndex]) return;

            const optionIdInput = optionEl.querySelector('.option-id');
            const optionTextInput = optionEl.querySelector('.option-text');

            if (optionIdInput && optionTextInput) {
                blankData.options[optionIndex].id = optionIdInput.value;
                blankData.options[optionIndex].text = optionTextInput.value;
            }
        });


        const correctSelect = blankEl.querySelector('.correct-answer');
        if (correctSelect) {
            blankData.correct = correctSelect.value;
        }
    });
}


function saveSevenSelectFiveData() {
    const sevenData = currentExamData.questions.sevenSelectFive;


    const titleInput = document.getElementById('seven-title');
    if (titleInput) {
        sevenData.title = titleInput.value;
    }


    const dialogueElements = document.querySelectorAll('#seven-dialogue .option-item');
    sevenData.dialogue = [];
    dialogueElements.forEach(dialogueEl => {
        const speakerInput = dialogueEl.querySelector('.speaker');
        const textInput = dialogueEl.querySelector('.dialogue-text');

        if (speakerInput && textInput) {
            sevenData.dialogue.push({
                speaker: speakerInput.value,
                text: textInput.value
            });
        }
    });


    const optionElements = document.querySelectorAll('#seven-options .option-item');
    sevenData.options = [];
    optionElements.forEach(optionEl => {
        const idInput = optionEl.querySelector('.option-id');
        const textInput = optionEl.querySelector('.option-text');

        if (idInput && textInput) {
            sevenData.options.push({
                id: parseInt(idInput.value) || sevenData.options.length + 1,
                text: textInput.value
            });
        }
    });


    const countInput = document.getElementById('seven-count');
    if (countInput) {
        sevenData.count = parseInt(countInput.value) || 1;
    }
}


function saveGrammarData() {
    const grammarData = currentExamData.questions.grammar;

    
    const titleInput = document.getElementById('grammar-title');
    if (titleInput) {
        grammarData.title = titleInput.value;
    }

    
    const passageInput = document.getElementById('grammar-passage');
    if (passageInput) {
        grammarData.passage = passageInput.value;
    }

    
    const countInput = document.getElementById('grammar-count');
    if (countInput) {
        grammarData.count = parseInt(countInput.value) || 1;
    }

    
    const blankElements = document.querySelectorAll('.question-item[data-blank-id^="grammar-"]');
    const blanks = [];

    blankElements.forEach((blankEl, blankIndex) => {
        
        if (blankEl.style.display === 'none' || blankEl.classList.contains('hidden')) {
            return; 
        }

        const blankData = {};

        
        const blankId = blankEl.getAttribute('data-blank-id');
        blankData.uniqueId = `grammar-A-${blankIndex + 1}`;
        blankData.id = blankIndex + 1;

        
        const textInput = blankEl.querySelector('.blank-text');
        if (textInput && textInput.value !== undefined) {
            blankData.text = textInput.value || '';
        } else {
            blankData.text = '';
        }

        
        const hintInput = blankEl.querySelector('.blank-hint');
        if (hintInput && hintInput.value !== undefined) {
            blankData.hint = hintInput.value || '';
        } else {
            blankData.hint = '';
        }

        
        const typeSelect = blankEl.querySelector('.blank-type');
        if (typeSelect) {
            blankData.type = typeSelect.value || 'withHint';
        } else {
            blankData.type = 'withHint';
        }

        
        const placeholderInput = blankEl.querySelector('.blank-placeholder');
        if (placeholderInput && placeholderInput.value !== undefined) {
            blankData.placeholder = placeholderInput.value || '';
        } else {
            blankData.placeholder = '';
        }

        
        const correctInput = blankEl.querySelector('.correct-answer');
        if (correctInput && correctInput.value !== undefined) {
            blankData.correct = correctInput.value || '';
        } else {
            blankData.correct = '';
        }

        
        blanks.push(blankData);
    });

    
    grammarData.blanks = blanks;
}




function saveExtractData() {
    const extractData = currentExamData.questions.extract;

    
    const titleInput = document.getElementById('extract-title');
    if (titleInput) {
        extractData.title = titleInput.value;
    }

    
    const passageInput = document.getElementById('extract-passage');
    if (passageInput) {
        extractData.passage = passageInput.value;
    }

    
    const countInput = document.getElementById('extract-count');
    if (countInput) {
        extractData.count = parseInt(countInput.value) || 1;
    }

    
    const questionElements = document.querySelectorAll('[data-question-id^="extract-"]');
    questionElements.forEach((questionEl, questionIndex) => {
        if (!extractData.questions[questionIndex]) return;

        const questionData = extractData.questions[questionIndex];

        
        const typeSelect = questionEl.querySelector('.question-type');
        if (typeSelect) {
            questionData.type = typeSelect.value;
        }

        
        const titleInput = questionEl.querySelector('.question-title');
        if (titleInput) {
            questionData.title = titleInput.value;
        }

        
        if (questionData.type === 'table') {
            
            if (!questionData.rows) {
                questionData.rows = [];
            }

            const rowElements = questionEl.querySelectorAll('.option-item');
            questionData.rows = [];

            rowElements.forEach((rowEl) => {
                const labelInput = rowEl.querySelector('.row-label');
                const placeholderInput = rowEl.querySelector('.row-placeholder');
                const correctInput = rowEl.querySelector('.row-correct');

                if (labelInput && placeholderInput && correctInput) {
                    questionData.rows.push({
                        label: labelInput.value,
                        placeholder: placeholderInput.value,
                        correct: correctInput.value
                    });
                }
            });

            
            delete questionData.question;
            delete questionData.placeholder;
            delete questionData.maxWords;
            delete questionData.correct;
            
        } else {
            const questionContentEl = document.querySelector('#question-content-extract-' + questionIndex);
            let textInput, placeholderInput, maxWordsInput, correctInput,questioninput;
            if (questionContentEl) {
                textInput = questionContentEl.querySelector('.question-text');
                placeholderInput = questionContentEl.querySelector('.question-placeholder');
                maxWordsInput = questionContentEl.querySelector('.question-maxwords');
                correctInput = questionContentEl.querySelector('.question-correct');
                questioninput = questionContentEl.querySelector('.question-title');
            } 
            else {
                textInput = questionEl.querySelector('.question-text');
                placeholderInput = questionEl.querySelector('.question-placeholder');
                maxWordsInput = questionEl.querySelector('.question-maxwords');
                correctInput = questionEl.querySelector('.question-correct');
                questioninput = questionEl.querySelector('.question-title');
            }
            
            if (textInput) {
                questionData.question = textInput.value;
            }
            if(questioninput) {
                questionData.title = questioninput.value;
            }
            if (placeholderInput) {
                questionData.placeholder = placeholderInput.value;
            }
            
            if (maxWordsInput) {
                questionData.maxWords = parseInt(maxWordsInput.value) || 50;
            }
            
            if (correctInput) {
                questionData.correct = correctInput.value;
            }
            
        
            delete questionData.rows;
        }
    });
}


function saveWritingData() {
    const writingData = currentExamData.questions.writing;


    const titleInput = document.getElementById('writing-title');
    if (titleInput) {
        writingData.title = titleInput.value;
    }


    const requirementsInput = document.getElementById('writing-requirements');
    if (requirementsInput) {
        writingData.requirements = requirementsInput.value;
    }


    const pointElements = document.querySelectorAll('#writing-points .option-item');
    writingData.points = [];
    pointElements.forEach(pointEl => {
        const pointInput = pointEl.querySelector('.writing-point');
        if (pointInput) {
            writingData.points.push(pointInput.value);
        }
    });


    const noteInput = document.getElementById('writing-note');
    if (noteInput) {
        writingData.note = noteInput.value;
    }


    const minWordsInput = document.getElementById('writing-minwords');
    if (minWordsInput) {
        writingData.minWords = parseInt(minWordsInput.value) || 100;
    }
    const exampleInput = document.getElementById('writing-example');
    if (exampleInput) {
        writingData.example = exampleInput.value;
    }
}


function updatePreview() {
    const previewContent = document.getElementById('preview-content');

    if (!currentExamData) {
        previewContent.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 40px;">没有可预览的数据</p>';
        return;
    }


    const formattedJson = JSON.stringify(currentExamData, null, 2);


    const highlightedJson = highlightJson(formattedJson);

    previewContent.innerHTML = `<div class="json-viewer">${highlightedJson}</div>`;
}


function highlightJson(json) {

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');


    json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, function (match) {
        let cls = 'json-string';
        if (/:$/.test(match)) {
            cls = 'json-key';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    }).replace(/\b(true|false|null)\b/g, function (match) {
        return '<span class="json-boolean">' + match + '</span>';
    }).replace(/\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g, function (match) {
        return '<span class="json-number">' + match + '</span>';
    });

    return json;
}


function copyJsonToClipboard() {
    if (!currentExamData) {
        showMessage('没有可复制的数据', 'error');
        return;
    }

    const jsonString = JSON.stringify(currentExamData, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
        showMessage('JSON已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showMessage('复制失败，请手动复制', 'error');
    });
}


function downloadExamData() {
    if (!currentExamData) {
        showMessage('没有可下载的数据', 'error');
        return;
    }


    saveChanges();

    const jsonString = JSON.stringify(currentExamData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('文件下载成功', 'success');
}


function resetEditor() {
    if (confirm('确定要重置编辑器吗？所有未保存的更改将丢失。')) {
        currentExamData = null;
        currentQuestionType = null;

        document.getElementById('editor-container').classList.add('hidden');
        document.getElementById('file-upload-area').style.display = 'block';
        document.getElementById('download-btn').disabled = true;

        document.getElementById('exam-title').value = '';
        document.getElementById('exam-time').value = '';

        document.getElementById('preview-content').innerHTML =
            '<p style="color: #6c757d; text-align: center; padding: 40px;">加载数据后，此处将显示JSON预览</p>';

        showMessage('编辑器已重置', 'success');
    }
}


function showMessage(message, type = 'info') {
    const messageArea = document.getElementById('message-area');


    const existingMessage = messageArea.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;

    messageArea.appendChild(messageDiv);


    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}


document.addEventListener('DOMContentLoaded', init);