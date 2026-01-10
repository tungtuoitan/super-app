
# step 1
1. UPDATE TABLE
update bảng dbo.keywords, thêm cột nameIndex, dành cho list các keyword có name trùng nhau
mặc định row có nameIndex = 1, khi có row mới, nếu tên bị trùng thì nameIndex = currentMaxIndex của name đó + 1
ta cũng cần thêm cột longLink trong dbo.keywords nữa (dạng workspaceName[nameIndex]/folderName[nameIndex]/noteName[nameIndex]/heading[nameIndex])
- các name ta giữ nguyên si
- à khi lưu cột link ta nên lưu dạng w-[workspaceId]/fi-[workspaceItemId của folder]/ni-[workspaceItemId của note]/heading[nameIndex]
trong bảng thì name + nameIndex là unique nhé, id cũng unique, link cũng unique
- thêm cột type, nó sẽ có value: external/workspace/folder/note/h1/h2/h3/h4/h5/h6
- cứ viết script drop table rồi tạo lại nhé, bỏ hết data hiện tại

2. GET KEYWORDS 
hiện tại ta đang dùng api  C:\Users\Admin\source\Timeline\SuperAppAPI\Controllers\KeywordController.cs để lấy keyword lên, hãy sửa lại chỉ để lấy trong bảng keywords thôi, k lấy từ chỗ khác nữa. 



# step 2
LOGIC BUILD/REBUILD KEYWORDS


## workspace
tạo workspace:
- tạo 1 keyword cho nó và insert
đổi tên workspace:
- affect: link của nó và tất cả con cháu, bao gồm cả link của heading. 
- ta cần update longLink của chúng

## folder
tạo folder
- tạo 1 keyword cho nó và insert
đổi tên folder
- affect: longLink của nó và tất cả con cháu, bao gồm longLink của heading trong note
- logic update:
- lấy A.link, longLink hiện tại của folder
- tính A.newLongLink
- tìm các row có link CONTAIN A.link và update chúng với và A.newLongLink
- 
move folder A
- affect: link của nó và tất cả con cháu, bao gồm cả link của heading. 
- ta cần update link và longLink
- logic:
- lấy A.link, longLink hiện tại của folder
- tính A.newLink, A.newLongLink
- tìm các row có link CONTAIN A.link và update chúng với A.newLink, và A.newLongLink

delete folder A (k ảnh hưởng)

hard delete folder A trong 1 workspace
- xoá hết link các con cháu của chúng, bằng cách tìm các row có link CONTAIN A.link

## note
tạo note
- tạo 1 keyword cho nó và insert
- lấy ra tất cả heading trong note.description và insert vào bảng keyword
đổi tên note
- affect: longLink của nó và longLink các heading trong note
- logic update:
- lấy A.link, longLink hiện tại của note
- tính A.newLongLink
- tìm các row có link CONTAIN A.link và update chúng với và A.newLongLink
- 
move note A
- affect: link của nó và tất cả heading bên trong. 
- ta cần update link và longLink
- logic:
- lấy A.link, longLink hiện tại của note
- tính A.newLink, A.newLongLink
- tìm các row có link CONTAIN A.link và update chúng với A.newLink, và A.newLongLink

delete note A (k ảnh hưởng)

hard delete note A
- xoá hết link các con cháu của chúng, bằng cách tìm các row có link CONTAIN A.link


## heading trong note
thêm heading / xoá heading
check heading trong description và các row trong bảng keyword, nếu có heading nào chưa có keyword tương ứng thì insert. còn heading nào bị mất thì xoá đi

1 heading bị thay đổi thì coi như là heading cũ đã bị xoá, và 1 heading mới được tạo ra

hard delete note A
- xoá hết link các con cháu của chúng, bằng cách tìm các row có link CONTAIN A.link






# step 3
4. UPDATE KEYWORDS
- khi ta update workspace/folder (có thay đổi tên file) --> update các row tương ứng trong keyword
- khi 1 note có nhiều workspaceItem, thì nó sẽ có nhiều link
- khi update name của keywords, ta cũng cần update nameIndex của nó







# step 4
1. LƯU KEYWORD ID VÀO DESCRIPTION
- ta nên lưu keyword id vào description, với cú pháp [[id]], khi allKeywords được update (change name,...), ta dễ dàng update các keyword trong các tab đang mở, 
- nếu lưu dạng [name][nameIndex] thì khi change name, ta cần 1 bảng map [oldName,newName], nếu cách này an toàn thì rất tiện lợi
- 
3. HIỂN THỊ KEYWORD DẠNG [name][nameIndex]
hiện tại ta đang dùng keywords trong MarkdownEditor C:\Users\Admin\source\SuperApp\src\Components\Editor\MarkdownEditor.tsx (trong description của note). và ta chỉ hiển thị name của keywords, điều này có vấn đề vì nó k unique. tôi muốn chuyển sang hiển thị dạng [name][nameIndex]


# step 5
1. UPDATE SEARCH FIELD
- update searchField để tương ứng với SearchIcon trong vsCode, dùng để search text description toàn db

2. NEW FEATURE: CTRL + P
search toàn bộ bảng link, tương tự vs code





