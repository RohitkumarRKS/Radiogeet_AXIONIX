import sys

with open('templates/core/settings.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the modal form HTML block
modal_start_tag = '<!-- Tank Configuration Modal -->'
modal_end_tag = '</div>\n</div>\n{% endblock %}'
start_idx = content.find(modal_start_tag)
end_idx = content.find('{% endblock %}', start_idx)

modal_html = content[start_idx:end_idx]

# 2. Modify modal HTML to be an inline card
inline_html = modal_html.replace('class="modal-backdrop" id="tank-modal-backdrop"', 'class="card" id="tank-modal-backdrop" style="display: none; margin-top: 20px; border: 1px solid var(--primary-green); padding: 20px;"')
inline_html = inline_html.replace('class="modal-container"', 'class=""')
inline_html = inline_html.replace('id="tank-modal-form" method="POST" action=""', 'id="tank-modal-form" method="POST" action="" style="margin-top: 20px;"')
inline_html = inline_html.replace('class="modal-body"', 'class=""')
inline_html = inline_html.replace('class="modal-footer"', 'class="form-actions" style="display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;"')

# Remove inline !important flex properties since it's no longer a modal
inline_html = inline_html.replace('style="display: flex !important; flex-direction: column !important; max-height: 85vh !important;"', '')
inline_html = inline_html.replace('style="display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important;"', '')

# 3. Remove modal from bottom
new_content = content[:start_idx] + '\n' + content[end_idx:]

# 4. Insert inline form after mapping-actions-row
insertion_point = new_content.find('<div class="mapping-actions-row">')
if insertion_point != -1:
    insertion_end = new_content.find('</div>', insertion_point) + len('</div>')
    # wait, there are two divs inside mapping-actions-row?
    # No, it's just <button> and <p> inside
    # Let's search for the exact HTML instead
    exact_html = '<button class="btn btn-outline" type="button" id="add-tank-btn">+ Add Tank</button>'
    btn_point = new_content.find(exact_html)
    if btn_point != -1:
        # Find the closing div of mapping-actions-row
        insertion_end = new_content.find('</div>', btn_point) + len('</div>')
        new_content = new_content[:insertion_end] + '\n\n' + inline_html + new_content[insertion_end:]
    else:
        print('Could not find btn exact html!')
else:
    print('Could not find insertion point!')

with open('templates/core/settings.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
