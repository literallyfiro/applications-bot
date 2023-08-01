export interface UserData {
    user_answers: {
        [key: string]: string[];
    },
    in_progress: string | undefined,
    banned: boolean,
    accepted: boolean,
}