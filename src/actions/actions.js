import { GET_FROM_STOCK } from './types'

export const getFromStock = () => {
  console.log('action get from stock ', GET_FROM_STOCK)
  return {
    type: GET_FROM_STOCK
  }
}



/*
export const addTodo = content => ({
  type: ADD_TODO,
  payload: {
    id: ++nextTodoId,
    content
  }
});
*/
