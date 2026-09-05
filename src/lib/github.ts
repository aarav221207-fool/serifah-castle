import { Octokit } from '@octokit/rest';

let octokit: Octokit | null = null;

export const initGitHub = (token: string) => {
  octokit = new Octokit({ auth: token });
  return octokit;
};

export const getOctokit = () => {
  if (!octokit) throw new Error('GitHub not initialized');
  return octokit;
};
