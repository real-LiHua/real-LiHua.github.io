#!/bin/bash

POSTS_DIR="src/posts"

mapfile -t posts < <(ls -1t "$POSTS_DIR"/*.md 2>/dev/null || true)

get_title() {
	local file="$1"
	local title
	title=$(sed -n 's/^title: *//p' "$file" | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
	if [[ -z "$title" ]]; then
		title=$(basename "$file" .md)
	fi
	echo "$title"
}

generate_choice() {
	local file="$1"
	local title
	title=$(get_title "$file")
	local display
	display=$(basename "$file")
	echo -e "$title|$display"
}

choices=("新建文章")
for post in "${posts[@]}"; do
	choices+=("$(generate_choice "$post")")
done

selected=$(printf '%s\n' "${choices[@]}" |
	fzf --height=40% --reverse --prompt="选择操作: " \
		--delimiter='|' --with-nth=1 \
		--preview "echo {} | cut -d'|' -f2 | xargs -I{} head -20 '${POSTS_DIR}/{}'" |
	cut -d'|' -f2)

if [[ -z "$selected" ]]; then
	exit 0
fi

if [[ "$selected" == "新建文章" ]]; then
	read -p "请输入文章标题: " title
	if [[ -z "$title" ]]; then
		echo "标题不能为空"
		exit 1
	fi

	slug=$(echo "$title" | sed 's/[^[:alnum:][:space:]]//g' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
	date=$(date +%Y-%m-%d)
	filepath="${POSTS_DIR}/${date}-${slug}.md"

	if [[ -f "$filepath" ]]; then
		echo "文件已存在: $filepath"
		exit 1
	fi

	cat >"$filepath" <<EOF
---
title: ${title}
description: 
tags: []
publishDate: ${date}
---

EOF

	echo "已创建: $filepath"
	nvim "$filepath"
else
	nvim "${POSTS_DIR}/${selected}"
fi
