
# description
 hiện tại navigationHistory đang được sync với localStorage, tôi cũng muốn openTabs sync với localStorage (để mỗi khi vào ta sẽ mở ra các tab đang dùng, với tab note  
  thì lấy data từ noteGrid, nếu tab ws thì lấy từ wsGrid,... nếu k có thì ta sẽ load note/ws đó từ db lên, truyền vào 1 chuỗi các id để load, có thể ta cần thêm        
  param ids vào api vì có thể chúng chưa có)
  công việc:
  - khi mở/đóng tab -> update local storage
  - khi vào web, nếu có data từ local storage thì lấy data, set vào openTabs và hiển thị data (nếu k có data từ các grid thì tự load lên), và lúc này ta hiển thị       
  loading cho VsEditorArea.tsx > tab bar. 

# fe component
C:\Users\Admin\source\SuperApp\src\Components\VSCodeLayout\VSEditorArea.tsx



# api backend
C:\Users\Admin\source\Timeline\SuperAppAPI\Controllers\NotesController.cs
C:\Users\Admin\source\Timeline\SuperAppAPI\Controllers\WsController.cs