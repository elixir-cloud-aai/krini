import React, { FC } from 'react';
import { ContentProps } from './types';

const Content: FC<ContentProps> = ({ content }) => {
  const renderBlock = (block: any) => {
    return block.text.map((segment: any) => {
      return (
        <span
          className={`${segment.annotations.bold ? 'font-semibold' : ''} 
                  ${segment.annotations.italic ? 'italic' : ''}
                  ${segment.annotations.underline ? 'underline' : ''}
                  ${
                    segment.annotations.code
                      ? 'font-mono bg-gray-200 p-1 rounded-md tracking-wider'
                      : // " dark:text-gray-800"
                        ''
                  }`}
          key={segment.content}
        >
          {segment.link ? (
            <a
              key={segment.content}
              href={segment.link}
              className={`text-elixirblue hover:underline `}
            >
              {segment.content}
            </a>
          ) : (
            <span key={segment.content}>{segment.content}</span>
          )}
        </span>
      );
    });
  };

  return content.map((block) => {
    if (block) {
      if (
        block.type === 'paragraph' ||
        block.type === 'heading_1' ||
        block.type === 'heading_2' ||
        block.type === 'heading_3' ||
        block.type === 'callout' ||
        block.type === 'quote' ||
        block.type === 'code'
      ) {
        let textStyle = '';
        if (block.type === 'heading_1') {
          textStyle = 'text-3xl font-bold';
        } else if (block.type === 'heading_2') {
          textStyle = 'text-2xl font-bold';
        } else if (block.type === 'heading_3') {
          textStyle = 'text-xl font-semibold';
        } else if (block.type === 'callout') {
          textStyle =
            'p-2 hover:bg-gray-100  hover:shadow-md shadow-lg border rounded-md text-center';
          // dark:bg-gray-900 dark:hover:bg-gray-800 dark:border-gray-800 dark:hover:border-gray-900
        } else if (block.type === 'quote') {
          textStyle = 'font-cursive text-2xl';
        } else {
          textStyle = 'text-justify';
        }
        return (
          <div
            className={`leading-relaxed my-3 tracking-wide  ${textStyle}`}
            key={block.id}
          >
            {/* dark:text-gray-200 */}
            {renderBlock(block)}
          </div>
        );
      } else if (block.type === 'bulleted_list_item') {
        return (
          <ul
            className={`leading-relaxed my-3 tracking-wide list-disc`}
            key={block.id}
          >
            {/* dark:text-gray-200  */}
            <li>{renderBlock(block)}</li>
          </ul>
        );
      } else if (block.type === 'divider') {
        return <hr className="my-3 border-t border-gray-300" key={block.id} />;
      } else {
        return (
          <img
            key={block.id}
            src={block.image}
            alt="Image"
            className="my-10"
            width="auto"
            height="auto"
          ></img>
        );
      }
    }
    return <></>;
  });
};

export default Content;
