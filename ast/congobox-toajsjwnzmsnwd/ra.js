class tmdbaseauthdownyho {
    constructor(timeWindow = 60000) {
        this.timeWindow = timeWindow;
    }
    async generateTimeKey(timestamp = null) {
        const time = timestamp || Date.now();
        const timeBlock = Math.floor(time / this.timeWindow);
        const encoder = new TextEncoder();
        const timeSeed = encoder.encode(`time-seed-${timeBlock}`);
        const baseKey = await crypto.subtle.importKey(
            'raw',
            timeSeed,
            { name: 'HKDF' },
            false,
            ['deriveKey']
        );

        const timeKey = await crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                salt: encoder.encode('time-salt'),
                info: encoder.encode('time-key'),
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return { timeKey, timeBlock };
    }


    async writenewwords(plaintext) {
        const encoder = new TextEncoder();
        const timestamp = Date.now();
        const { timeKey, timeBlock } = await this.generateTimeKey(timestamp);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            timeKey,
            encoder.encode(plaintext)
        );
        const result = {
            timeBlock: timeBlock,
            iv: Array.from(iv),
            ciphertext: Array.from(new Uint8Array(encrypted))
        };

        return btoa(JSON.stringify(result));
    }
    async writebacknewwords(encryptedBase64) {
        try {
            const decoder = new TextDecoder();
            const data = JSON.parse(atob(encryptedBase64));
            const currentTimeBlock = Math.floor(Date.now() / this.timeWindow);
            if (Math.abs(currentTimeBlock - data.timeBlock) > 1) {
                throw new Error('验证失败');
            }
            const { timeKey } = await this.generateTimeKey(data.timeBlock * this.timeWindow);
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(data.iv)
                },
                timeKey,
                new Uint8Array(data.ciphertext)
            );

            return decoder.decode(decrypted);
        } catch (error) {
            console.error('验证失败:', error.message);
            return null;
        }
    }
}