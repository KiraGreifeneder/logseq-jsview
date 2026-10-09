const course_pages = await jsq.simpleQuery(`(page-property :semester "WS26")`)

let table = `
    <table class=table-auto>
        <thead>
            <th>name</th>
`

const table_end = "</thead> </table>"

for (page of course_pages) {
    table = table.concat(`
        <tr> <td> ${page.name} </td> </tr>    
    `)
}

table.concat(table_end)

return table