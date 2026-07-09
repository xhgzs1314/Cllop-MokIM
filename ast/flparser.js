class FLParser {
	/**
	 * @param {Object} options - 解析配置
	 * @param {boolean} [options.keyToLowerCase=true] - 键名转为小写
	 * @param {boolean} [options.trimKey=true] - 去除键名前后空格
	 * @param {boolean} [options.autoTypeConvert=true] - 自动转换值类型
	 * @param {boolean} [options.strictMode=false] - 严格模式
	 */
	constructor(options = {}) {
		this.options = {
			keyToLowerCase: true,
			trimKey: true,
			autoTypeConvert: true,
			strictMode: false,
			...options
		};
		this.resetState();
	}

	resetState() {
		this.currentRecord = {};
		this.currentKey = null;
		this.currentValueBuffer = [];
		this.lineNumber = 0;
		this.errors = [];
		this.nestingStack = [this.currentRecord]; 
		this.currentLevel = 0; 
	}

	normalizeKey(key) {
		let normalized = key;
		if (this.options.trimKey) normalized = normalized.trim();
		if (this.options.keyToLowerCase) normalized = normalized.toLowerCase();
		return normalized;
	}

	convertValueType(value) {
		if (!this.options.autoTypeConvert) return value;
		if (value.trim() === '') return null;
		if (value === 'true') return true;
		if (value === 'false') return false;
		if (value === 'null') return null;
		if (/^-?\d+(\.\d+)?$/.test(value)) {
			return value.includes('.') ? parseFloat(value) : parseInt(value, 10);
		}
		return value;
	}

	addError(message) {
		const error = new Error(`Line ${this.lineNumber}: ${message}`);
		this.errors.push(error);
		if (this.options.strictMode) throw error;
	}
	getCurrentParent(level) {
		if (level < 0) {
			this.addError('嵌套层级不能为负数');
			return this.nestingStack[0];
		}
		while (this.nestingStack.length <= level) {
			const newObj = {};
			const parentLevel = this.nestingStack.length - 1;
			const parent = this.nestingStack[parentLevel];
			let targetKey = null;
			Object.keys(parent).forEach(key => {
				if (typeof parent[key] === 'object' && parent[key] !== null && Object.keys(parent[key])
					.length === 0) {
					targetKey = key;
				}
			});

			if (targetKey) {
				parent[targetKey] = newObj; 
			} else {
				this.addError(`无法创建层级 ${this.nestingStack.length}，缺少父级关联键`);
				return this.nestingStack[0];
			}

			this.nestingStack.push(newObj);
		}

		return this.nestingStack[level];
	}

	processLine(line) {
		this.lineNumber++;
		const trimmedLine = line.trim();
		if (trimmedLine === '' || trimmedLine.startsWith('#')) return null;
		if (trimmedLine === '//') {
			return this.finalizeRecord();
		}
		let level = 0;
		let lineContent = line;
		while (lineContent.startsWith('->')) {
			level++;
			lineContent = lineContent.slice(2).trimStart(); 
		}


		if (lineContent.includes(':')) {
			if (this.currentKey) {
				this.flushCurrentValue();
			}

			const colonIndex = lineContent.indexOf(':');
			const keyPart = lineContent.slice(0, colonIndex);
			const valuePart = lineContent.slice(colonIndex + 1);
			const normalizedKey = this.normalizeKey(keyPart);

			if (normalizedKey === '') {
				this.addError('无效的空键名');
				this.currentKey = null;
				return null;
			}
			const parent = this.getCurrentParent(level);
			if (Object.hasOwn(parent, normalizedKey)) {
				this.addError(`键名重复: ${normalizedKey} (层级: ${level})`);
			}
			const valueWithoutComment = valuePart.split('#', 1)[0].trimStart();
			this.currentKey = normalizedKey;
			this.currentValueBuffer = [valueWithoutComment];
			this.currentLevel = level;
			return null;
		}
		if (this.currentKey) {
			const valueWithoutComment = lineContent.split('#', 1)[0];
			this.currentValueBuffer.push(valueWithoutComment);
			return null;
		}

		this.addError('未关联键名的单行值');
		return null;
	}

	flushCurrentValue() {
		if (!this.currentKey) return;
		const rawValue = this.currentValueBuffer.join('\n').trimEnd();
		const convertedValue = this.convertValueType(rawValue);
		const parent = this.getCurrentParent(this.currentLevel);
		if (convertedValue === '' || convertedValue === null) {
			parent[this.currentKey] = {};
		} else {
			parent[this.currentKey] = convertedValue;
		}
		this.currentKey = null;
		this.currentValueBuffer = [];
		this.currentLevel = 0;
	}

	finalizeRecord() {
		if (this.currentKey) {
			this.flushCurrentValue();
		}

		if (Object.keys(this.currentRecord).length === 0) return null;

		const record = {
			...this.currentRecord
		};
		this.resetState(); 
		return record;
	}

	parse(text) {
		this.resetState();
		const lines = text.split('\n');
		const records = [];

		for (const line of lines) {
			const record = this.processLine(line);
			if (record) records.push(record);
		}
		const finalRecord = this.finalizeRecord();
		if (finalRecord) records.push(finalRecord);

		return {
			records,
			errors: this.errors
		};
	}

	
	createStreamParser(onRecord, onError, onEnd, onProgress) {
		this.resetState();
		let partialLine = '';
		let isEnded = false;
		const parser = this;
		const processSingleLine = (line) => {
			try {
				const record = parser.processLine(line);
				if (onProgress) onProgress(parser.lineNumber);
				if (record) onRecord(record);
			} catch (err) {
				if (onError) onError(err);
				if (!parser.options.strictMode) return true;
				return false; 
			}
			return true;
		};

		return {
			write(chunk) {
				if (isEnded) {
					const err = new Error('解析器已结束，不能再写入数据');
					if (onError) onError(err);
					return false;
				}
				try {
					const content = typeof chunk === 'string' ? chunk : chunk.toString();
					let remaining = content;
					let currentPos = 0;
					let lineBreakPos;
					while ((lineBreakPos = remaining.indexOf('\n', currentPos)) !== -1) {
						const line = partialLine + remaining.substring(currentPos, lineBreakPos);
						partialLine = '';
						currentPos = lineBreakPos + 1;
						const normalizedLine = line.replace('\r', '');
						if (!processSingleLine(normalizedLine)) {
							return false; 
						}
					}
					partialLine += remaining.substring(currentPos);
					return true;
				} catch (err) {
					if (onError) onError(err);
					return !parser.options.strictMode; 
				}
			},
			end() {
				if (isEnded) return;
				isEnded = true;
				try {
					if (partialLine !== '') {
						const normalizedLine = partialLine.replace('\r', '');
						processSingleLine(normalizedLine);
					}
					const finalRecord = parser.finalizeRecord();
					if (finalRecord) onRecord(finalRecord);
					if (onEnd) onEnd();
				} catch (err) {
					if (onError) onError(err);
				}
			},
			reset() {
				parser.resetState();
				partialLine = '';
				isEnded = false;
			},
			getState() {
				return {
					isEnded,
					hasPartialLine: partialLine !== '',
					partialLineLength: partialLine.length,
					currentLineNumber: parser.lineNumber,
					hasErrors: parser.errors.length > 0,
					errorCount: parser.errors.length
				};
			}
		};
	}
}