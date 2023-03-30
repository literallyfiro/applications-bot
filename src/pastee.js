export class Pastee {

    constructor(contents, applicationKey, sectionLang = "text", description = "", sectionName = "main", encrypted = false) {
        this.contents = contents;
        this.applicationKey = applicationKey;
        this.sectionLang = sectionLang;
        this.description = description;
        this.sectionName = sectionName;
        this.encrypted = encrypted;

        this.endpoint = "https://api.paste.ee/v1/pastes";
    }

    async createPaste() {
        return (async () => {
            const rawResponse = await fetch(this.endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    'description': this.description,
                    'encrypted': this.encrypted,
                    'sections': [
                        {
                            'name': this.sectionName,
                            'syntax': this.sectionLang,
                            "contents": this.contents
                        },
                    ]
                }),
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Auth-Token': this.applicationKey,
                }
            });
            const content = await rawResponse.json();

            return content;
        })();
    }
}