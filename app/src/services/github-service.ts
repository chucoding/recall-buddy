import { getCommits, getFilename, getMarkdown } from '../api/github-api';

export async function getGithubData(daysAgo: number): Promise<string | null> {
    const interval = 24 * daysAgo * 60 * 60 * 1000;
    const currentDate = new Date();
    const pastDate = new Date(currentDate.getTime() - interval);

    const since = new Date(pastDate);
    since.setHours(0, 0, 0, 0);

    const until = new Date(pastDate);
    until.setHours(23, 59, 59, 999);

    const commits = await getCommits(since, until);

    if (commits.length === 0) {
        return null;
    }

    for (let commit of commits) {
        const commit_detail = await getFilename(commit.sha);
        let dump: Record<string, string> = {}; 
        for (let file of commit_detail.files) {
            if(file.filename.endsWith(".md")) {
                if (dump && Object.keys(dump).includes(file.filename)) {
                    return dump[file.filename];
                } else {
                    const data = await getMarkdown(file.filename);
                    dump[file.filename] = data;
                    return data;
                }
            }
        }
    }
    return null;
}
