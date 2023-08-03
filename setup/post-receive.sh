#!/usr/bin/env bash
echo "##### post-receive hook #####"
read oldrev newrev refname
echo "Push triggered update to revision $newrev ($refname)"

RUN_FOR_REF="refs/heads/main"
if [[ "$refname" ==  "$RUN_FOR_REF" ]]; then
    GIT="env -i git"
    CMD_CD="cd $(readlink -nf "$PWD/..")"
    CMD_FETCH="$GIT fetch"
    CMD_DEPS="npm ci"
    CMD_BUILD="nice npm run build"
    CMD_MIGRATE="npm run db up"
    CMD_RESTART="pm2 restart pm2.json"

    echo "$ $CMD_CD"
    eval ${CMD_CD}
    echo "$ $CMD_FETCH"
    eval ${CMD_FETCH}

    if $GIT diff --name-only $oldrev $newrev | grep "^package-lock.json"; then
        echo "$ $CMD_DEPS"
        eval $CMD_DEPS
    else
        echo "# Skipping npm install, lockfile not modified"
    fi

    if $GIT diff --name-only $oldrev $newrev | grep "^\(src\|package-lock.json\)/"; then
        echo "$ $CMD_BUILD"
        if eval $CMD_BUILD; then
          echo "Build successful"
        else
          echo "Build failed"
          exit 1
        fi
    else
        echo "# Skipping build, no changes in src folder"
    fi

    echo "$ $CMD_MIGRATE"
    eval $CMD_MIGRATE

    echo "$ $CMD_RESTART"
    eval $CMD_RESTART
else
    echo "Ref does not match $RUN_FOR_REF, exiting."
fi

echo "##### end post-receive hook #####"
