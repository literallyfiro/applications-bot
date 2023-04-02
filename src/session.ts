export interface SessionData {
    user_answers: {
        [key: string]: string[]
    };
    in_progress: string | undefined;
    banned: boolean;
    accepted: boolean;
    conversation?: undefined;
}

// Workaround because I can't figure out how to get another user session lmao
export type TempData = {
    __d: SessionData;
};