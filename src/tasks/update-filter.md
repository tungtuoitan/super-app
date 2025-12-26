
# 
tôi muốn $user lưu thêm 1 thuộc tính, filters, nó sẽ là object gồm filter của noteGrid, wsGrid, workspace,...
ví dụ : $user = {
    ...
    filters: {
        'noteGrid':{
            statusCode: "active,inactive",
            ...
        },
        'wsGrid': {
            ...
        },
    
    }
}

- các thuộc tính trong filters tương ứng với các view của mình, và ta hãy lưu chúng trong constant
- mặc định khi 1 filter có value, ta sẽ dùng value mặc định cũng được lưu trong constants (vd: defaultFilter: {
    noteGrid: {statusCode: "active"},
    workspace: {statusCode: "active"}
})
các value trong đó đều là dạng chuỗi chứa nhiều value, ví dụ: "active,inactive" hoặc "01,02,05", hoặc đối với các field như name thì ta sẽ 

mỗi lần ta gọi api thì dùng những data filter này để truyền xuống, và ta filter ở repository
ta sẽ hiển thị những filter này ở trong  C:\Users\Admin\source\SuperApp\src\Components\shared\GenericFilterPopup.tsx theo dạng check box, ví dụ:
status
[] Active
[] Inactive
------
Create
from date
to date
----
....


- với các filter thuộc về standardRegistry thì ta sẽ lấy value trong đó, rồi hiển thị ra dạng checkbox để user chọn, còn date thì ta dùng field date from date to.  còn các field text như name thì k cần filter vì ta đã có chức năng search rồi.
---
bạn có thể tham khảo best practice các filter đơn giản để gợi ý cho tôi thêm nếu bạn thấy hợp, cả  UI nữa. hãy nghiên cứu rồi cho tôi plan ngắn gọn của bạn.