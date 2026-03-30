Prepare and open a pull request for the current branch in the Papershare project.

Steps:

1. Run `git diff main...HEAD --stat` to see all changed files.
2. Run `git log main...HEAD --oneline` to list all commits on this branch.
3. Run `npm run lint:eslint:check` — fix any errors before proceeding.
4. Run `npx tsc --noEmit` — note any new type errors introduced by this branch (pre-existing ones can be ignored).
5. Draft the PR:
   - Title: conventional commit style, under 70 chars (e.g. `feat: add document upload endpoint`)
   - Body sections: Summary (bullet points of what changed), Test plan (what was tested), Breaking changes (if any)
6. Create the PR with `gh pr create` using the drafted title and body.
7. Return the PR URL.
